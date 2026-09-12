UPDATE product_catalog SET data_json=json_set(data_json,
 '$.amount',95000,'$.available',json('true'),
 '$.name','Cartão NFC PVC Personalizado',
 '$.tagline','O seu cartão, impresso e personalizado.',
 '$.description','Cartão NFC em PVC de 85,5 × 54 mm. Inclui impressão a cores na frente e no verso, personalização com o seu logótipo, nome e email, e configuração NFC e QR para o seu perfil.'),version=version+1 WHERE id='pvc';
