/**
 * Textos de las fichas flotantes. Edita este archivo para cambiar títulos, párrafos y datos curiosos.
 * El visor los inserta como texto (textContent), no como HTML, para evitar inyección de marcado.
 */
export const ANATOMY_CONTENT = {
  brain: {
    title: 'El cerebro',
    subtitle: 'Centro de control del sistema nervioso',
    paragraphs: [
      'El cerebro integra información sensorial y participa en el movimiento, la memoria, el lenguaje, las emociones y la toma de decisiones.',
      'La corteza cerebral se organiza en regiones con funciones especializadas que trabajan coordinadamente. El encéfalo también contiene estructuras profundas esenciales para el movimiento, la motivación y la regulación corporal.',
      'En el modelo, los surcos dorados representan de forma artística los pliegues de la superficie cerebral; no son una reconstrucción médica exacta.'
    ],
    fact: 'El cerebro y la médula espinal forman, junto con los nervios periféricos, el sistema nervioso.'
  },
  heart: {
    title: 'El corazón',
    subtitle: 'La bomba muscular de la circulación',
    paragraphs: [
      'El corazón impulsa la sangre a través de dos circuitos: la circulación pulmonar, que permite el intercambio de gases en los pulmones, y la circulación sistémica, que distribuye sangre al resto del organismo.',
      'Sus cuatro cavidades y sus válvulas coordinan el flujo sanguíneo. La contracción y la relajación rítmicas generan el latido que se representa aquí mediante una animación suave.',
      'En esta visualización, las arterias se muestran en rojo y las venas en azul por convención gráfica; los vasos reales presentan variaciones y no son tubos uniformes.'
    ],
    fact: 'El corazón late de manera continua, pero su frecuencia cambia con la actividad, el descanso y otros factores.'
  }
};
