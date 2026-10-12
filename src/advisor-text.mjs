const advisorNames={elephant:'Mammoth',lion:'Berserk Lion',wolf:'Alpha Wolf',rat:'Colossal Rat',revenge:'Avenger’s Box',muzzle:'Gag of Agony',saw:'Rusty Saw',keys:'Lost Key Ring',rope:'Hangman’s Rope',fire:'Burning Stake',nest:'Writhing Iron Box',rathead:'Rat Head Necklace',ring:'Three-Headed Thumb Ring',horn:'Horn of Strife',wine:'Crimson Vintage',brand:'Brand of Original Sin'};
const advisorRarities=['Normal','Magic','Rare','Legendary','Ultimate','Chromatic'];
const advisorText={
  title:['Talos Advisor','Помощник Talos'], open:['Advisor','Помощник'],close:['Close advisor','Закрыть помощника'],
  intro:['Visible-state heuristic · no automatic moves. Aim: more Chromatic, not currency profit.','Эвристика по открытым данным · без автоматических ходов. Цель: больше Chromatic, а не доход в валюте.'],
  limits:['Probabilities use this save’s practice settings. Estimates are not an optimal strategy or official game odds. Original advice remains available.','Вероятности взяты из тренировочных настроек сохранения. Оценка не доказывает оптимальность и не отражает официальные шансы. Авторские советы остаются доступны.'],
  waiting:['Start or continue a run to see advice.','Начните или продолжите партию.'],
  missing:['No readable autosave. Advice is unavailable until the game saves successfully.','Нет доступного автосохранения. Совет появится после успешного сохранения игры.'],
  unsupported:['Supported: Management Practice v0.6.14, including mark scenarios. Escort Challenge and legacy reward rules need a different advisor.','Поддерживается Management Practice v0.6.14, включая сцены с метками. Для Escort Challenge и старых правил нужен другой алгоритм.'],
  invalid:['Save format or settings are not supported. No move is recommended.','Формат сохранения или настройки не поддерживаются. Рекомендация не выдаётся.'],
  stale:['Waiting for the board and autosave to agree. No current move is recommended.','Жду совпадения поля и автосохранения. Сейчас рекомендация не выдаётся.'],
  busy:['An action is resolving. Waiting for the new position.','Идёт действие. Жду новое состояние поля.'],
  finished:['Management is complete. This advisor does not predict combat or loot.','Управление завершено. Помощник не прогнозирует бой и добычу.'],
  context:['Day {day}/{days} · {count} on board · {rainbow} Chromatic','День {day}/{days} · на поле: {count} · Chromatic: {rainbow}'],
  best:['Suggested move','Предлагаемый ход'], alternatives:['Alternatives','Другие варианты'], risks:['Tradeoffs','Риски и условия'],warnings:['Keep in mind','Учитывайте'],
  instructions:['Make the move using the original game controls and confirm it there.','Выполните ход обычными кнопками игры и подтвердите его там.'],
  eat:['Cell {room} consumes Cell {prey}','Камера {room} съедает камеру {prey}'],
  reroll:['Replace Cell {room}','Заменить в камере {room}'],visit:['Patrol to Cell {room}','Патруль в камеру {room}'],endAction:['End the day','Завершить день'],
  choose:['Choose {item}','Выбрать {item}'],accept:['Accept incident','Принять событие'],skip:['Skip incident','Пропустить событие'],
  eatRule:['Cell {room}: {rarity} {species} has a legal target in Cell {target}.','У {rarity} {species} из камеры {room} есть допустимая цель в камере {target}.'],
  scratch:['Scratch Marks: base gain is {gain} tiers under the current settings.','Scratch Marks: базовый рост по текущим настройкам — {gain} ступени.'],
  muzzle:['Gag checks {count} Inmates ({timing}); extra tiers: {bonus}.','Gag считает {count} заключённых ({timing}); дополнительных ступеней: {bonus}.'],
  rathead:['Rat Head Necklace adds one tier to this Rat’s Consume.','Rat Head Necklace добавляет крысе одну ступень за это поглощение.'],
  revenge:['Avenger’s Box has a 30% trigger chance, but creates food only if the eater remains on the board and a closed cell is available afterward.','Шанс Avenger’s Box — 30%, но пища появится только если едок останется на поле и после действия будет закрытая камера.'],
  breakPrey:['This can break a Prey bond and lose its remaining daily upgrades.','Ход может разорвать Prey и лишить пару будущего ежедневного роста.'],
  saw:['Rusty Saw: 25% chance of one extra tier, capped at Chromatic.','Rusty Saw: 25% на дополнительную ступень, максимум Chromatic.'],
  growth:['Resulting rarity: {forecast}.','Итоговая редкость: {forecast}.'],
  randomCode:['The Code changes randomly. Recheck pairings after resolution.','Вид изменится случайно. После действия заново проверьте пары.'],
  replaceOdds:['Cell {room}, {rarity} {species}: downgrade risk {down}; immediate pairing chance {pairs} before any Tusk upgrades.','Камера {room}, {rarity} {species}: риск понижения {down}; шанс немедленной пары {pairs} до возможных повышений Tusk.'],
  rope:['Hangman’s Rope excludes Normal and Magic from the replacement pool.','Hangman’s Rope исключает Normal и Magic при замене.'],
  fire:['Burning Stake: eligible below-Legendary replacements have a 40% adjustment to Legendary; eligibility is checked {timing}.','Burning Stake: для подходящей редкости ниже Legendary действует 40% на Legendary; условие проверяется {timing}.'],
  tusk:['Tusk upgrades up to four open-cell Inmates; the replaced Inmate is {included}. Its value is estimated, not a full rollout.','Tusk повышает до четырёх заключённых в открытых камерах; заменённый заключённый {included}. Польза оценочная, полного перебора продолжений нет.'],
  replacementCost:['Spends one replacement for today. A pairing is not guaranteed, and this is not a forecast of the hidden roll.','Расходует одну замену сегодня. Пара не гарантирована; скрытый результат броска не предсказывается.'],
  keepHigher:['This preserves the higher-tier Inmates in {rooms} instead of rerolling their accumulated growth.','Так вы сохраняете более редких заключённых в {rooms}, не сбрасывая накопленный ими рост.'],
  protectHigh:['Protect Cell {room}: {rarity} {species}. This conservative policy does not recommend replacing Legendary/Ultimate.','Берегите камеру {room}: {rarity} {species}. Защитное правило помощника не рекомендует заменять Legendary/Ultimate.'],
  preyWait:['Prey can upgrade both partners at day start. Avoid breaking it without a clear immediate payoff.','Prey повышает обоих партнёров в начале дня. Не разрывайте связь без понятной немедленной выгоды.'],
  end:['Advance time: {days} days remain after this one; {waiting} active Prey bonds/nests can benefit from waiting.','После этого дня останется {days}; активных связей Prey и гнёзд, которым полезно время: {waiting}.'],
  patrol:['Cell {room}: opens {count} currently closed cells on this {route}.','Камера {room}: на этом {route} откроется закрытых камер — {count}.'],
  keys:['Lost Key Ring: 80% trigger chance; {count} adjacent cells are currently closed.','Lost Key Ring: 80% на срабатывание; сейчас закрытых соседних камер — {count}.'],
  openMarks:['Opening clears {count} Scratch Marks/nest cells on the route.','Открытие очистит Scratch Marks или гнёзда в {count} камерах пути.'],
  unknownEvent:['A visible incident marker is present. Its hidden type is not used in this recommendation.','Виден маркер события. Его скрытый тип не учитывается в совете.'],
  knownTier:['Revealed rarity: {rarity}. The hidden Code remains unknown.','Показанная редкость: {rarity}. Скрытый вид неизвестен.'],
  skipEvent:['Keep the opened Inmate and avoid the incident’s additional effect.','Сохранить открытого заключённого, не применяя дополнительный эффект события.'],
  chain:['Prepares one future clockwise patrol. {closed} cells are closed; {days} future days remain.','Подготовит один следующий патруль по часовой стрелке. Закрытых камер: {closed}; будущих дней: {days}.'],
  chainMarks:['Along-route incidents do not trigger; opening also clears Scratch Marks and nests.','События по пути не запускаются; открытие также очищает Scratch Marks и гнёзда.'],
  execution:['Cell {room} removes {count} lower-tier countered Inmates ({rooms}); rarity changes from {from} to {to}.','Камера {room} удалит {count} подходящих заключённых меньшей редкости ({rooms}); рост с {from} до {to}.'],
  executionLoss:['Victims are lost. Eligibility is fixed before the growth; the new rarity does not expand the victim pool.','Жертвы исчезнут. Список определяется до роста; новая редкость не расширяет список жертв.'],
  toolHeuristic:['Item selection is a situation-based estimate, not an exhaustive item ranking.','Выбор предмета — оценка текущей ситуации, а не результат полного сравнения всех продолжений.'],
  tool_muzzle:['Gag: {count} Inmates count toward its limit under your settings; strongest at three or fewer. {days} management days including today remain.','Gag: по вашим настройкам учитывается {count} заключённых; особенно полезен при трёх и менее. Осталось дней, включая сегодня: {days}.'],
  tool_revenge:['Avenger’s Box can replenish same-tier food after Consumes. Closed cells: {closed}; days: {days}.','Avenger’s Box может давать пищу той же редкости после поглощений. Закрытых камер: {closed}; дней: {days}.'],
  tool_keys:['Lost Key Ring adds neighboring cell openings. Closed cells: {closed}; days: {days}.','Lost Key Ring добавляет открытия соседних камер. Закрытых камер: {closed}; дней: {days}.'],
  tool_saw:['Rusty Saw adds a 25% extra-tier chance to Consumes. Remaining days: {days}.','Rusty Saw даёт 25% на дополнительную ступень при поглощении. Осталось дней: {days}.'],
  tool_rathead:['Rat Head Necklace expands Rat pairings and adds a tier to Rat Consumes. The estimate considers current Rats.','Rat Head Necklace расширяет пары для крыс и добавляет им ступень. Оценка учитывает крыс на поле.'],
  tool_rope:['Hangman’s Rope makes replacements at least Rare under supported settings; useful for low-tier or stranded Inmates.','Hangman’s Rope даёт при замене минимум Rare по поддерживаемым настройкам; полезен для низких и застрявших заключённых.'],
  tool_fire:['Burning Stake improves some replacements but removes one daily destination. Remaining days: {days}.','Burning Stake улучшает часть замен, но убирает одно направление патруля в день. Осталось дней: {days}.'],
  tool_nest:['Iron Box creates Rat Nests: {delay} day transitions to hatch; {days} days including today remain.','Iron Box создаёт гнёзда: до созревания {delay} смен дня; осталось дней, включая сегодня: {days}.'],
  gift_ring:['Opens up to {count} closed cells now. Extra openings do not trigger other opening effects.','Сейчас откроет до {count} закрытых камер. Дополнительные открытия не запускают другие эффекты открытия.'],
  gift_wine:['Crimson Vintage raises {count} current below-Legendary Inmates by one tier.','Crimson Vintage повысит на ступень {count} заключённых ниже Legendary.'],
  wineRandom:['Your settings also randomize their Codes.','В ваших настройках их виды также меняются случайно.'],
  gift_brand:['{count} foodless Inmates could gain food through a Code change at their current rarity.','Для {count} заключённых без пищи смена вида потенциально создаст цель на текущей редкости.'],
  brandSample:['At most four foodless Inmates are sampled. Different rarities alone cannot be repaired by changing Codes.','Выбирается до четырёх заключённых без пищи. Несовпадение редкостей одной сменой вида не исправить.'],
  gift_horn:['{count} current attackers have targets. Horn can start Consumes for them.','Сейчас у {count} потенциальных едоков есть цели. Horn может запустить их поглощения.'],
  hornRandom:['Targets are random and can disappear before a later attacker acts. The estimate is approximate.','Цели случайны и могут исчезнуть до хода следующего едока. Оценка приблизительная.']
};
export function advisorMessage(key,args={},language='en'){
  const ru=language==='ru',i=ru?1:0,pct=n=>`${(n*100).toFixed(2).replace(/\.?0+$/,'')}%`;
  const vars={...args,species:advisorNames[args.code]??'',rarity:advisorRarities[args.tier]??'',
    timing:args.timing==='before'?(ru?'до действия':'before the action'):(ru?'после действия':'after the action'),
    included:args.included?(ru?'включён в выбор':'included'):(ru?'исключён из выбора':'excluded'),
    route:args.chain?(ru?'маршруте Chain Reaction':'Chain Reaction route'):(ru?'посещении':'visit')};
  if(args.down!==undefined)vars.down=pct(args.down);if(args.pairs!==undefined)vars.pairs=pct(args.pairs);
  if(args.from!==undefined)vars.from=advisorRarities[args.from];if(args.to!==undefined)vars.to=advisorRarities[args.to];
  if(args.distribution)vars.forecast=args.distribution.map(d=>`${advisorRarities[d.tier]} ${pct(d.chance)}`).join(' / ');
  if(args.rooms)vars.rooms=args.rooms.length?args.rooms.map(n=>`#${n}`).join(', '):'—';
  const template=advisorText[key]?.[i];if(template===undefined)throw Error(`Unknown advisor message: ${key}`);
  return template.replace(/\{(\w+)\}/g,(_,name)=>String(vars[name]??''));
}
export function advisorActionLabel(action,language='en'){
  const args={...action,room:action.room+1,prey:action.prey+1,item:advisorNames[action.id]};
  return advisorMessage(action.type==='end'?'endAction':action.type==='event'?(action.accept?'accept':'skip'):action.type,args,language);
}
