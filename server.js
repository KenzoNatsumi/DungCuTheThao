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
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use(express.static(path.join(__dirname, 'public')));

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
const getProductCode = (loaisanpham) => {
  switch (loaisanpham) {
      case 'Áo bóng đá':
          return 'AOBD';
      case 'Dụng cụ thể thao':
          return 'DCTT';
      case 'Giày':
          return 'GIAY';
      default:
          return 'SPKHAC'; // Mã mặc định cho loại sản phẩm khác
  }
};

const generateProductId = async (loaisanpham, db) => {
  const productCode = getProductCode(loaisanpham);
  console.log("Mã loại sản phẩm:", productCode);
    try {
        const counter = await db.collection('counters').findOneAndUpdate(
            { _id: productCode },
            { $inc: { seq: 1 } },
            { upsert: true, returnDocument: 'after' }
        );
        console.log("Kết quả findOneAndUpdate:", counter);
        if (counter && counter.seq !== undefined) {
        const nextCounter = counter.seq.toString().padStart(4, '0');
        return `${productCode}${nextCounter}`;
        }
    } catch (error) {
        console.error("Lỗi khi tạo ID:", error);
        return null; // Hoặc một giá trị mặc định/xử lý lỗi khác
    }
};

// API thêm sản phẩm mới
app.post('/them', upload.single('hinhanh'), async (req, res) => {
  console.log("Dữ liệu nhận được từ frontend:", req.body);
  const { tensanpham, loaisanpham, thuonghieu, giasanpham, khuyenmai, mota, bangsize } = req.body;
  const hinhanh = req.file ? '/images/' + req.file.filename : null;
  let newId;

  try {
      await client.connect(); // Đảm bảo kết nối MongoDB trước khi sử dụng
      const db = client.db(dbName);
      newId = await generateProductId(loaisanpham, db);

      if (!newId) {
          return res.status(500).json({ message: 'Lỗi khi tạo ID sản phẩm.' });
      }

      console.log("ID sản phẩm mới:", newId);

      let parsedBangSize = [];
      if (bangsize) {
          if (Array.isArray(bangsize)) {
              parsedBangSize = bangsize.map(item => ({ size: item.size, mausac: item.mausac, soluong: parseInt(item.soluong) }));
          } else if (typeof bangsize === 'object' && bangsize !== null) {
              parsedBangSize.push({ size: bangsize.size, mausac: bangsize.mausac, soluong: parseInt(bangsize.soluong) });
          }
      }

      const newProduct = {
          id: newId,
          tensanpham,
          loaisanpham: loaisanpham,
          thuonghieu,
          giasanpham: parseInt(giasanpham),
          khuyenmai,
          hinhanh: hinhanh ? `/images/${hinhanh}` : '',
          mota,
          bangsize: parsedBangSize,
          qna: [],
          binhluan: []
      };

      const collection = db.collection(collectionName);
      const result = await collection.insertOne(newProduct);
      if (result.insertedId) {
          res.status(201).json({ message: `Sản phẩm ${tensanpham} đã được thêm thành công với ID: ${newId}` });
      } else {
          res.status(500).json({ message: 'Lỗi khi thêm sản phẩm vào database.' });
      }
  } catch (error) {
      console.error('Lỗi khi thêm sản phẩm:', error);
      res.status(500).json({ message: 'Lỗi hệ thống' });
  } finally {
      // Không đóng client ở đây nếu bạn muốn tái sử dụng kết nối
      // await client.close();
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
