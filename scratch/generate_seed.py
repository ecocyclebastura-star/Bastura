import uuid
import json

raw_data = """
Besi Kropos: 1500
Besi Super (kualitas masih bagus): 2500
Blowing/hdmpe/botol sampo: 700
Botol Bersih Biru: 2000
Botol Bersih Putih: 2300
Botol Bersih Warna Campur: 1200
Botol Bir Bintang Besar: 200
Botol Bir Kecil: 100
Botol Kotor (Masih ada tutup dan bungkus): 1000
Botol Minyak/saos/kecap lasegar/toples: 300
Botol Oli: 1500
BOTOL PUTIH SUSU: 300
BUKU PAKET: 500
BURAM: 300
CD Kaset: 1200
Duplek/Majalah/Campur: 300
Emberan: 500
Gelas Bersih Bening: 1500
Gelas Bersih Warna: 1000
Gelas Kotor: 800
JERIGEN 10 LITER: 1000
JERINGEN 18 LITER: 1500
JERIGEN 20 LITER: 2000
JERIGEN 5 LITER: 500
Kaleng Emplung/Susu/Biskuit/Sarden: 500
Kaleng Rencek/Fanta dan sejenisnya: 8000
Kardus: 500
Karung: 200
Kerasan/Helm/Mainan Anak/Elektronik: 300
Kertas HVS: 1200
Koran: 4000
Mesin Cuci: 25000
Minyak Jelantah: 3000
Palet Plastik: 20000
Plastik Campur Campur: 300
Plastik Kresek Campur: 200
Plastik Kresek Putih: 400
Plastik PP (Kotak kue/makanan plastik): 1700
Plastik PS (Toples Kue Kering): 1000
Seng: 300
SHU 2022: 1000
Tali Rapiah: 200
Timah: 3000
Tutup Botol Campur: 1000
Tutup Botol Terpilah Warna: 2000
Tutup Galon: 1500
TV LCD BESAR: 7000
YAKULT: 300
"""

# Weight mapping hints based on previous manual queries
weights = {
    'Botol Bersih Biru': 25,
    'Botol Bersih Putih': 25,
    'Botol Bersih Warna Campur': 25,
    'Gelas Bersih Bening': 4,
    'Gelas Bersih Warna': 4,
    'Gelas Kotor': 4,
    'Kardus': 350,
    'Kertas HVS': 5,
    'Koran': 250,
    'Kaleng Rencek/Fanta dan sejenisnya': 18,
    'Kaleng Emplung/Susu/Biskuit/Sarden': 50,
    'JERIGEN 5 LITER': 200,
    'JERIGEN 10 LITER': 400,
    'JERINGEN 18 LITER': 700,
    'JERIGEN 20 LITER': 800,
    'Botol Bir Bintang Besar': 450,
    'Botol Bir Kecil': 250,
    'Tutup Galon': 5,
    'Tutup Botol Campur': 2,
    'Tutup Botol Terpilah Warna': 2,
    'YAKULT': 4,
    'Minyak Jelantah': 900,
    'CD Kaset': 15,
    'BUKU PAKET': 400
}

# Categories
# 1 = Plastik
# 2 = Kertas
# 3 = Logam & Kaca
# 4 = Lainnya

def get_category(name):
    name_lower = name.lower()
    if any(x in name_lower for x in ['buku', 'kertas', 'koran', 'kardus', 'duplek', 'buram']):
        return 2
    if any(x in name_lower for x in ['besi', 'kaleng', 'timah', 'seng', 'botol bir', 'kuningan']):
        return 3
    if any(x in name_lower for x in ['mesin cuci', 'tv lcd', 'minyak', 'cd kaset', 'elektronik']):
        return 4
    return 1 # default plastik

lines = raw_data.strip().split('\n')
sql_inserts = []
sql_inserts.append("-- Kategori Tambahan")
sql_inserts.append("INSERT INTO waste_category (id_waste_category, category_name, ct_description)")
sql_inserts.append("VALUES")
sql_inserts.append("  (3, 'Logam & Kaca', 'Sampah logam, besi, aluminium, dan kaca'),")
sql_inserts.append("  (4, 'Lainnya', 'Sampah elektronik, minyak jelantah, dsb')")
sql_inserts.append("ON CONFLICT (id_waste_category) DO NOTHING;\n")
sql_inserts.append("SELECT setval(pg_get_serial_sequence('waste_category', 'id_waste_category'), (SELECT MAX(id_waste_category) FROM waste_category));\n")

sql_inserts.append("INSERT INTO waste_catalog (id_waste, name, category_id, unit, price, description, catalog_img, unit_weight_gram)")
sql_inserts.append("VALUES")

values = []
for line in lines:
    if not line.strip(): continue
    parts = line.split(':')
    name = parts[0].strip()
    price = int(parts[1].strip())
    
    category = get_category(name)
    weight = weights.get(name, 'NULL')
    
    id_uuid = str(uuid.uuid4())
    values.append(f"  ('{id_uuid}', '{name}', {category}, 'kg', {price}, 'Data dari PDF PDF Sampah dan Harga per Kg', 'catalog-test.png', {weight})")

sql_inserts.append(",\n".join(values))
sql_inserts.append("ON CONFLICT (id_waste) DO NOTHING;")

with open('scratch/seed_output.sql', 'w') as f:
    f.write('\n'.join(sql_inserts))

print("Done")
