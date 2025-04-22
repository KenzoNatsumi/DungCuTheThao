const { MongoClient } = require('mongodb');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path'); 
const multer = require('multer');
const app = express();
const port = 3000;

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'dsSanPham';
const collectionName = 'DungCuTheThao';

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public/page')));
app.use(express.static(path.join(__dirname, 'public/images/')));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/page/index.html');
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + file.originalname;
    cb(null, uniqueSuffix);
  }
});

const upload = multer({ storage: storage });

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
app.get('/dssanpham', async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const danhSach = await collection.find({}).toArray();
    console.log("Dữ liệu lấy từ MongoDB:", danhSach);
    res.json(danhSach);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm:", error);
    res.status(500).json({ error: 'Lỗi server' });
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

// Cập nhật sản phẩm
app.put('/capnhat/:id', upload.single('hinhanh'), async (req, res) => {
  const { id } = req.params;
  const { tensanpham, loaisanpham, thuonghieu, giasanpham, khuyenmai, mota, bangsize } = req.body;
  const hinhanh = req.file ? req.file.filename : null;

  try {
    const collection = await connectDB();

    const existingProduct = await collection.findOne({ id });
    if (!existingProduct) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm để cập nhật' });
    }

    const updateFields = {
      tensanpham,
      loaisanpham,
      thuonghieu,
      giasanpham,
      khuyenmai,
      mota,
      bangsize: Array.isArray(bangsize) ? bangsize : [bangsize],
    };

    if (hinhanh) updateFields.hinhanh = hinhanh;

    await collection.updateOne({ id }, { $set: updateFields });

    res.json({ message: `Sản phẩm ${id} đã được cập nhật thành công!` });
  } catch (error) {
    console.error('Lỗi khi cập nhật sản phẩm:', error);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
});


//API xoá sản phẩm theo id
app.delete('/dssanpham/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    const collection = await connectDB();
    const result = await collection.deleteOne({ id: productId }); // Dùng `id`, không phải `_id`

    if (result.deletedCount === 1) {
      res.send(`Sản phẩm với ID = ${productId} đã bị xóa.`);
    } else {
      res.status(404).send(`Sản phẩm với ID = ${productId} không tồn tại.`);
    }
  } catch (error) {
    console.error('Lỗi khi xóa sản phẩm:', error);
    res.status(500).send('Lỗi máy chủ');
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

app.get('/api/sanpham/filter', async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const { category, trademark, price } = req.query;

    const query = {};
    if (category) query.loaisanpham = category;
    if (trademark) query.thuonghieu = trademark;

    const allData = await collection.find(query).toArray();

    let filtered = allData;

    if (price) {
      filtered = allData.filter(sp => {
        const gia = parseInt(sp.giasanpham);
        if (price === '0-500000') return gia < 500000;
        if (price === '500000-1000000') return gia >= 500000 && gia <= 1000000;
        if (price === '1000000-2000000') return gia > 1000000 && gia <= 2000000;
        if (price === '2000000+') return gia > 2000000;
        return true;
      });
    }

    res.json(filtered);
  } catch (error) {
    console.error("Lỗi khi lọc sản phẩm:", error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.get('/api/sanpham/search', async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const { keyword } = req.query;
    const query = keyword
      ? { tensanpham: { $regex: keyword, $options: 'i' } }
      : {};

    const danhSach = await collection.find(query).toArray();
    res.json(danhSach);
  } catch (error) {
    console.error("Lỗi khi tìm kiếm sản phẩm:", error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
