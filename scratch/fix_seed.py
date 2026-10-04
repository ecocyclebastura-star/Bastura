import re
with open('bastura-db/init-scripts/02-seed.sql', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('catalog_img, unit_weight_gram)', 'catalog_img)')
text = re.sub(r", 'catalog-test\.png', (NULL|\d+)\)", r", 'catalog-test.png')", text)

with open('bastura-db/init-scripts/02-seed.sql', 'w', encoding='utf-8') as f:
    f.write(text)
print('Done')
