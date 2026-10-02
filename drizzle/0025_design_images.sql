CREATE TABLE design_images (
 id TEXT PRIMARY KEY CHECK(id IN ('standard','customer','team')),
 image TEXT NOT NULL,
 alt TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 0
);
INSERT INTO design_images(id,image,alt) VALUES
 ('standard','/design/standard.svg','Exemplo do design FramyConnect'),
 ('customer','/design/customer.svg','Envio do seu design em PDF vectorial'),
 ('team','/design/team.svg','Criação de um design pela equipa');
