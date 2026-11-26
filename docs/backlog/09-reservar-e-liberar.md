# 09 — Reservar e liberar

**Estado:** a fazer · **Depende de:** 08 · **Spec:** §7 · **Telas:** `App-Reservar`, `App-Liberar`, `App-Drawer-Reservado`

Como membro, quero reservar um ambiente e devolvê-lo quando terminar.

## Critérios de aceite
- [ ] Reservar só em ambiente livre, pelo card ou pelo drawer.
- [ ] Prazos: 4 horas, 24 horas, 3 dias, até liberar; o padrão vem das Configurações.
- [ ] Ticket e nota opcionais; o ticket informado passa a ser o do ambiente.
- [ ] Duas reservas simultâneas: o banco aceita uma; a outra recebe erro claro e a tela atualiza.
- [ ] Reserva vencida é encerrada na leitura ou na ação seguinte, com um único evento datado no vencimento.
- [ ] Liberar reserva: só quem reservou ou admin (403 para os demais, botão escondido).
- [ ] Liberar uso manual: qualquer membro.
- [ ] Liberar volta a livre, limpa ticket, Dev e QA e mantém as branches; nota opcional.
- [ ] Liberar algo já vencido ou liberado atualiza a tela com mensagem clara.
- [ ] Reserva, liberação e expiração vão para o histórico.

## Notas técnicas
- Índice único parcial para uma reserva aberta por ambiente. Relógio injetável para testar prazos.

## Fora de escopo
Notificações, fila de espera.
