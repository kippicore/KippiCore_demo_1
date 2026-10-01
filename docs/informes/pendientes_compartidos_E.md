# Cambios compartidos pedidos (oleada E)

## E3 (worktree-agent-ae76099fb536302b4, 794fb07)
1. `validarForma` (src/dominio/comandos/configuracion.ts): permitir volver un número a `null` (`divisorHorasMes` "calcular automáticamente").
2. `SelectorMoneda` (src/ui/conectados/Contexto.tsx): tooltip con las tasas vigentes del estado, no `TASA_EJEMPLO`.
3. `Badge` sin `data-testid` (también pedido por C1).
4. Riesgo: un local nuevo con `vende: true` entra en todo lo que lista locales; verificar en flujos.

## E2 (worktree-agent-aeff2ef2fd67c0f15, 2758060)
1. `src/config/marca.ts` `MARCA.hablarConKippicore.whatsapp`: número de Miguel (PREGUNTADO; pendiente de respuesta).
2. `rutas.ts` `inicio`: query `{ resaltar: texto }`.
3. `Pista`: z-index del punto o no mostrar mientras el panel de la guía está desplegado (inicio.alertas queda tapada).
4. `window.__kc.emitirUI`.
5. CONTRATOS §10 fila E2: quitar "Pendiente de A1"; anotar que E2 lee `bus.historialUI`.
6. Franja de navegador interno ≈ 88 px en iOS (spec 40 px).

## E1 (worktree-agent-a8d6674376d2ad91d, b39bd67)
1. `LayoutMovil`: punto accent en Hoy (cierre con diferencia sin revisar) y en Más (alertas/aprobaciones).
2. `HojaLigera` con `createPortal` a body; `HojaApp` → reexport.
3. `ChipDatosEjemplo` compartido no dice qué pasó con el QR (E1 usa ChipDatos propio).
4. `selAlertas` aprobaciones → `/app/mas/aprobar` desde escritorio (en curso en compartidos CD).
5. **Rendimiento**: /app 2.704 ms con máquina cargada (límite 2.500); construcción ≈ 2,1 s de 2,3 s. Re-medir con máquina tranquila; si no pasa, aplicar palancas de F2-B (índices en dominio).
