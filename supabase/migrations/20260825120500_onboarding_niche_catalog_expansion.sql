-- Retire the original 6-bucket niche list in favor of the expanded, more
-- specific list below. Rows are deactivated (not deleted) so any
-- already-approved profile's creator_niches link stays valid.
update public.niches
set is_active = false,
    updated_at = now()
where slug in ('beleza', 'gastronomia', 'moda', 'tecnologia', 'viagem');

insert into public.niches (slug, name, sort_order)
values
  ('lifestyle-e-rotina', 'Lifestyle e rotina', 10),
  ('moda-e-estilo', 'Moda e estilo', 20),
  ('beleza-maquiagem-e-cuidados-pessoais', 'Beleza, maquiagem e cuidados pessoais', 30),
  ('saude-nutricao-e-bem-estar', 'Saúde, nutrição e bem-estar', 40),
  ('fitness-esportes-e-atividade-fisica', 'Fitness, esportes e atividade física', 50),
  ('maternidade-paternidade-e-familia', 'Maternidade, paternidade e família', 60),
  ('infantil-e-conteudo-para-criancas', 'Infantil e conteúdo para crianças', 70),
  ('gastronomia-e-culinaria', 'Gastronomia e culinária', 80),
  ('viagens-e-turismo', 'Viagens e turismo', 90),
  ('casa-decoracao-e-organizacao', 'Casa, decoração e organização', 100),
  ('financas-investimentos-e-empreendedorismo', 'Finanças, investimentos e empreendedorismo', 110),
  ('tecnologia-games-e-inovacao', 'Tecnologia, games e inovação', 120),
  ('educacao-carreira-e-desenvolvimento-pessoal', 'Educação, carreira e desenvolvimento pessoal', 130),
  ('humor-e-entretenimento', 'Humor e entretenimento', 140),
  ('musica-arte-e-cultura', 'Música, arte e cultura', 150),
  ('pets-e-animais', 'Pets e animais', 160),
  ('sustentabilidade-e-consumo-consciente', 'Sustentabilidade e consumo consciente', 170),
  ('relacionamentos-e-sexualidade', 'Relacionamentos e sexualidade', 180),
  ('conteudo-adulto', 'Conteúdo adulto', 190),
  ('comunidades-e-causas-sociais', 'Comunidades e causas sociais', 200),
  ('marketing-publicidade-e-redes-sociais', 'Marketing, publicidade e redes sociais', 210)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
