-- Kategori Tambahan
INSERT INTO waste_category (id_waste_category, category_name, ct_description)
VALUES
  (3, 'Logam & Kaca', 'Sampah logam, besi, aluminium, dan kaca'),
  (4, 'Lainnya', 'Sampah elektronik, minyak jelantah, dsb')
ON CONFLICT (id_waste_category) DO NOTHING;

SELECT setval(pg_get_serial_sequence('waste_category', 'id_waste_category'), (SELECT MAX(id_waste_category) FROM waste_category));

INSERT INTO waste_catalog (id_waste, name, category_id, unit, price, description, catalog_img, unit_weight_gram)
VALUES
  ('3f74a7e3-3ddf-41bd-aa5d-5be08964b243', 'Besi Kropos', 3, 'kg', 1500, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('184649d5-271a-4c40-8d49-aaa90b13b754', 'Besi Super (kualitas masih bagus)', 3, 'kg', 2500, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('c49687b0-bb8a-4301-a759-14afa91e926e', 'Blowing/hdmpe/botol sampo', 1, 'kg', 700, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('612fb7a0-0b55-45a7-92d1-a9cd7ff24a43', 'Botol Bersih Biru', 1, 'kg', 2000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 25),
  ('5a7c4fc5-3692-40a9-90d8-bffeb37a6d09', 'Botol Bersih Putih', 1, 'kg', 2300, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 25),
  ('7188348c-700d-43ea-a3c1-556dc8061c36', 'Botol Bersih Warna Campur', 1, 'kg', 1200, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 25),
  ('3d6a3bb4-14f0-43ad-ac48-31d472d0b290', 'Botol Bir Bintang Besar', 3, 'kg', 200, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 450),
  ('39db7e78-74f0-42fe-9fc0-4e286239375c', 'Botol Bir Kecil', 3, 'kg', 100, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 250),
  ('c8c5cbca-3f31-4eeb-94c1-a71645f85c47', 'Botol Kotor (Masih ada tutup dan bungkus)', 1, 'kg', 1000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('6424e988-6aba-4163-9d8b-a3400784b49f', 'Botol Minyak/saos/kecap lasegar/toples', 4, 'kg', 300, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('73aa39db-092d-48e3-ad25-1a39f43875cc', 'Botol Oli', 1, 'kg', 1500, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('f9de30ac-0ca9-4f1e-b1c6-8ae16d449c39', 'BOTOL PUTIH SUSU', 1, 'kg', 300, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('89f7193b-4649-4ef8-a400-78e4d68683cb', 'BUKU PAKET', 2, 'kg', 500, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 400),
  ('1dcf8600-1feb-4d36-bb19-ad6163cd4dea', 'BURAM', 2, 'kg', 300, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('d34a57d5-aa2d-4fdf-862b-0e2fb4013579', 'CD Kaset', 4, 'kg', 1200, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 15),
  ('2a294e7d-2bb7-4c66-a469-020aab8dcd99', 'Duplek/Majalah/Campur', 2, 'kg', 300, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('3c34f864-5dda-4a47-a84a-0adcf1884c23', 'Emberan', 1, 'kg', 500, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('948989d0-8016-433a-baa4-7247d438f5a7', 'Gelas Bersih Bening', 1, 'kg', 1500, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 4),
  ('5f59fca3-a900-4482-931e-27668bb07e0a', 'Gelas Bersih Warna', 1, 'kg', 1000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 4),
  ('106bf051-77ac-43a5-8a80-b16b44927c09', 'Gelas Kotor', 1, 'kg', 800, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 4),
  ('54eb7e90-5d1b-4028-9e36-0102ad366faf', 'JERIGEN 10 LITER', 1, 'kg', 1000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 400),
  ('b642b910-cc46-46cd-941f-65429ce7c17f', 'JERINGEN 18 LITER', 1, 'kg', 1500, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 700),
  ('1570415a-ff05-4753-9fc9-69efc05b7cf5', 'JERIGEN 20 LITER', 1, 'kg', 2000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 800),
  ('be3a6db2-c337-4bc4-84f0-077ebcb851ed', 'JERIGEN 5 LITER', 1, 'kg', 500, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 200),
  ('3a74b3e6-4706-4dd2-bf60-dcea737b6177', 'Kaleng Emplung/Susu/Biskuit/Sarden', 3, 'kg', 500, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 50),
  ('52d13ee5-8e87-464a-9362-b5997abcfecd', 'Kaleng Rencek/Fanta dan sejenisnya', 3, 'kg', 8000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 18),
  ('725b4e00-fb8d-41ec-a71e-2b68f218a7ea', 'Kardus', 2, 'kg', 500, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 350),
  ('ab42c2f6-867a-4fe1-8b93-729532db9ccd', 'Karung', 1, 'kg', 200, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('8a43e7cb-477e-4ba5-bb8c-82557e8fe357', 'Kerasan/Helm/Mainan Anak/Elektronik', 4, 'kg', 300, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('2c4794d3-5863-4049-8674-7c8be0cc52a2', 'Kertas HVS', 2, 'kg', 1200, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 5),
  ('f6cfe8e0-240f-4f1c-9fff-e2d52d5e898a', 'Koran', 2, 'kg', 4000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 250),
  ('8667c3e7-1807-4821-afc4-c388acaf9690', 'Mesin Cuci', 4, 'kg', 25000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('a923464a-dfe8-4c72-9946-c65b5edfc9a9', 'Minyak Jelantah', 4, 'kg', 3000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 900),
  ('7954f87b-52b2-409d-8f8d-f3a2ee01a0fb', 'Palet Plastik', 1, 'kg', 20000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('00a0d6b2-a416-47be-995e-b750d5a6d4b1', 'Plastik Campur Campur', 1, 'kg', 300, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('7ba34538-0f48-4c56-9e7b-d6f470117f82', 'Plastik Kresek Campur', 1, 'kg', 200, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('fb48adf6-7c1b-480f-9b9c-d5e95d6f24bd', 'Plastik Kresek Putih', 1, 'kg', 400, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('1c9cb947-d392-4c25-a907-d3c73109bec3', 'Plastik PP (Kotak kue/makanan plastik)', 1, 'kg', 1700, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('41e4b996-98bf-41bd-9ddd-0cfeaccd2ea8', 'Plastik PS (Toples Kue Kering)', 1, 'kg', 1000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('fe8db183-1d47-4cc0-95e0-54fee439649d', 'Seng', 3, 'kg', 300, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('a0ec4347-8a61-4b23-ba08-760a2c2eacda', 'SHU 2022', 1, 'kg', 1000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('83028dd8-d446-4c93-ab99-f63b4b7cb6b4', 'Tali Rapiah', 1, 'kg', 200, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('bd9b1ed4-0342-4a1b-a8e1-2aacd8df1f12', 'Timah', 3, 'kg', 3000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('736fb96d-eaad-4f12-bd9a-d343e522620d', 'Tutup Botol Campur', 1, 'kg', 1000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 2),
  ('46eebf06-cfa5-40a3-b19f-abe59b86e311', 'Tutup Botol Terpilah Warna', 1, 'kg', 2000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 2),
  ('ae670f57-21df-48f7-8209-d818378f3915', 'Tutup Galon', 1, 'kg', 1500, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 5),
  ('81112f91-390b-4a0e-8765-ce1d004add09', 'TV LCD BESAR', 4, 'kg', 7000, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', NULL),
  ('9135f8cd-c809-447b-be60-7798754a6a60', 'YAKULT', 1, 'kg', 300, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', 4)
ON CONFLICT (id_waste) DO NOTHING;