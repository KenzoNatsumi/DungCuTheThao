const MongoClient = require('mongodb').MongoClient;
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path'); 
const multer = require('multer');
const app = express();
const port = 3000;

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
const dbName = 'dsSanPham';
const collectionName = 'DungCuTheThao';

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public/page')));
app.use(express.static(path.join(__dirname, 'public/images/')));
app.use(express.static('public'));

// Kết nối MongoDB
const connectDB = async () => {
  try {
    await client.connect();
    console.log('Kết nối thành công đến MongoDB!');
    return client.db(dbName).collection(collectionName);
  } catch (error) {
    console.error('Lỗi khi kết nối MongoDB:', error);
    throw error;
  }
};

// API lấy danh sách sản phẩm
app.get('/list', async (req, res) => {
  try {
    const collection = await connectDB();
    const sanphamList = await collection.find({}).toArray();
    res.json(sanphamList);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách sản phẩm từ MongoDB:', error);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
});

// API lấy sản phẩm theo ID
app.get('/getSanPham/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const collection = await connectDB();
    const sanpham = await collection.findOne({ id: id });

    if (!sanpham) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại!" });
    }

    res.json(sanpham);
  } catch (error) {
    console.error('Lỗi khi truy vấn MongoDB:', error);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
});

// API thêm sản phẩm mới
app.post('/themsanpham', upload.single('hinhanh'), async (req, res) => {
  const { id, tensanpham, loaisanpham, thuonghieu, giasanpham, khuyenmai, mota, bangsize } = req.body;
  const hinhanh = req.file ? req.file.filename : null;

  if (!id || !tensanpham || !loaisanpham || !thuonghieu || !giasanpham || !khuyenmai || !mota || !Array.isArray(bangsize) || bangsize.length === 0 || !hinhanh) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });
  }

  try {
    const collection = await connectDB();

    // Kiểm tra ID sản phẩm đã tồn tại chưa
    const idExists = await collection.findOne({ id: id });
    if (idExists) {
      return res.status(409).json({ message: `ID sản phẩm "${id}" đã tồn tại.` });
    }

    const newProduct = {
      id,
      tensanpham,
      loaisanpham,
      thuonghieu,
      giasanpham,
      khuyenmai,
      mota,
      hinhanh,
      bangsize,
    };

    await collection.insertOne(newProduct);
    res.json({ message: `Thêm sản phẩm ${newProduct.tensanpham} thành công!` });
  } catch (error) {
    console.error('Lỗi khi thêm sản phẩm vào MongoDB:', error);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
});

// API lấy danh sách sản phẩm dạng JSON
app.get('/dssanpham/json', async (req, res) => {
  try {
    const collection = await connectDB();
    const sanphamList = await collection.find({}).toArray();
    res.json(sanphamList);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách sản phẩm từ MongoDB:', error);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
});

// API xóa 1 sản phẩm theo ID
app.delete('/dssanpham/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    const collection = await connectDB();
    const result = await collection.deleteOne({ id: productId });

    if (result.deletedCount === 1) {
      res.send(`Sản phẩm với ID = ${productId} đã bị xóa.`);
    } else {
      res.status(404).send(`Sản phẩm với ID = ${productId} không tồn tại.`);
    }
  } catch (error) {
    console.error('Lỗi khi xóa sản phẩm từ MongoDB:', error);
    res.status(500).send('Lỗi hệ thống');
  }
});

// API xóa tất cả sản phẩm
app.delete('/dssanpham', async (req, res) => {
  try {
    const collection = await connectDB();
    await collection.deleteMany({});
    res.send('Tất cả sản phẩm đã bị xóa.');
  } catch (error) {
    console.error('Lỗi khi xóa tất cả sản phẩm từ MongoDB:', error);
    res.status(500).send('Lỗi hệ thống');
  }
});

// API tìm kiếm sản phẩm theo tên
app.get('/sanpham/timkiem/:tensanpham', async (req, res) => {
  const tensanpham = req.params.tensanpham.toLowerCase();
  try {
    const collection = await connectDB();
    const sptheoten = await collection.find({ tensanpham: { $regex: tensanpham, $options: 'i' } }).toArray();

    if (sptheoten.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm nào' });
    }
    res.json(sptheoten);
  } catch (error) {
    console.error('Lỗi khi tìm kiếm sản phẩm trong MongoDB:', error);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
