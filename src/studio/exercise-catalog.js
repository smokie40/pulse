export const exercises=[
 {id:'steady',ru:['Равномерные удары','Играй ровно, сохраняя одинаковые интервалы между ударами.'],en:['Even strokes','Keep the intervals between strokes even.']},
 {id:'ghost',ru:['Клик с паузами','Сохраняй темп, когда метроном замолкает.'],en:['Silent click bars','Keep the tempo when the click disappears.']},
 {id:'burst',ru:['Скоростные серии','Чередуй восьмые и шестнадцатые.'],en:['Speed bursts','Alternate eighth and sixteenth notes.']},
 {id:'morph',ru:['Смена длительностей','Меняй плотность ударов, сохраняя темп.'],en:['Rhythmic transitions','Change note values without changing the beat.']},
 {id:'ladder',ru:['Постепенное ускорение','Повышай темп небольшими шагами.'],en:['Tempo ladder','Increase the tempo in small steps.']},
 {id:'accent',ru:['Перемещение акцента','Перемещай акцент, сохраняя ровный ритм.'],en:['Moving accents','Shift the accent while keeping even timing.']},
 {id:'adaptive',ru:['Адаптивный темп','Темп меняется по результатам игры.'],en:['Adaptive tempo','Tempo responds to your timing.']}
];

export function renderLibrary({$,t,lang,musicArt}){ $('exerciseLibrary').innerHTML=exercises.map(e=>'<button class="exercise-tile choice-tile" data-mode="'+e.id+'"><span class="exercise-copy choice-copy"><strong>'+e[lang][0]+'</strong><span class="choice-caption">'+t('shortMode_'+e.id)+'</span><span class="tile-arrow choice-arrow" aria-hidden="true">›</span></span>'+musicArt(e.id)+'</button>').join('');}
