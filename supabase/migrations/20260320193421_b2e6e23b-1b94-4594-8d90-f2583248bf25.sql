
-- Move Mentorias to position 2, shift others down
UPDATE formations SET order_index = 7 WHERE id = '637a12df-d300-422c-9be3-a42c4d877438'; -- Mentorias temp
UPDATE formations SET order_index = 3 WHERE id = '4d926aa7-a05e-4227-9434-22329688e40e'; -- TikTok Shop 2->3
UPDATE formations SET order_index = 4 WHERE id = '86ca20f2-e041-420a-bb26-4733e0f30e72'; -- Shopee 3->4
UPDATE formations SET order_index = 5 WHERE id = 'f3d9f555-0556-4334-930d-9fa329bd3aca'; -- Tráfego Pago 4->5
UPDATE formations SET order_index = 6 WHERE id = 'd99b7740-a5d2-4821-9ed2-d4e777e0f422'; -- Criação de Loja 5->6
UPDATE formations SET order_index = 2 WHERE id = '637a12df-d300-422c-9be3-a42c4d877438'; -- Mentorias -> 2
