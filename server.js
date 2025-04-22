const express = require('express')
const bodyParser = require('body-parser');
const path = require('path'); 
const app = express()
const port = 3000
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public/page')));
app.use(express.static(path.join(__dirname, 'public/images/')));
app.use(express.static('public'));

const { MongoClient } = require('mongodb');

const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);
const dbName = 'local'; 
const collectionName = 'dsSanPham'; 

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
app.listen(port, () => console.log(`Example app listening on port ${port}!`))