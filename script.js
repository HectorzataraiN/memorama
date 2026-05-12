// Seleccionamos elementos del HTML para poder modificarlos desde JavaScript.
// querySelector busca el primer elemento que coincida con el selector.
const board = document.querySelector("#board");
const movesElement = document.querySelector("#moves");
const matchesElement = document.querySelector("#matches");
const totalPairsElement = document.querySelector("#totalPairs");
const timerElement = document.querySelector("#timer");
const bestScoreElement = document.querySelector("#bestScore");
const difficultyButtons = document.querySelectorAll(".difficulty-button");
const playerForm = document.querySelector("#playerForm");
const playerNameInput = document.querySelector("#playerName");
const currentPlayerElement = document.querySelector("#currentPlayer");
const leaderboardList = document.querySelector("#leaderboardList");
const registerDialog = document.querySelector("#registerDialog");
const skipRegisterButton = document.querySelector("#skipRegisterButton");
const restartButton = document.querySelector("#restartButton");
const playAgainButton = document.querySelector("#playAgainButton");
const winDialog = document.querySelector("#winDialog");
const finalScore = document.querySelector("#finalScore");

// Llave donde guardamos el nombre del jugador activo.
const currentPlayerKey = "memoramaCurrentPlayer";

// Llave donde guardamos todos los records por usuario.
const playerRecordsKey = "memoramaPlayerRecords";

// Arreglo principal de cartas del juego.
// Cada objeto representa una carta distinta. Luego el juego duplica este arreglo para crear las parejas.
// id: sirve para saber si dos cartas forman pareja.
// title: describe la imagen, util para accesibilidad.
// image: ruta de la imagen.
// size: cambia el ancho y alto de la imagen dentro de la carta.
// position: ajusta el recorte interno cuando la imagen usa object-fit: cover.
// offsetY: mueve la imagen hacia arriba o abajo. Negativo sube, positivo baja.
const cards = [
  { id: "html", title: "Coockie", image: "assets/coockie.png", size: "115%" },
  { id: "css", title: "Brownie", image: "assets/brownie.png", size: "115%" },
  { id: "js", title: "Lisa", image: "assets/lisa.png", position: "45% 0%", offsetY: "-25px" },
  { id: "ui", title: "Valentina", image: "assets/vale.png", size: "130%", position: "45% -30%", offsetY: "-30px" },
  { id: "api", title: "Lia", image: "assets/lia.png", position: "45% 0%", offsetY: "-16px", size: "80%" },
  { id: "git", title: "Abuelos", image: "assets/abuelos.png", size: "120%" },
  { id: "axel", title: "Axel", image: "assets/axel-vale.png", size: "115%" },
  { id: "peluche", title: "Peluche", image: "assets/peluche.png", size: "80%", offsetY: "-35px" }
];

// Configuracion de cada dificultad.
// pairCount indica cuantas parejas tendra el tablero.
// columnsClass cambia las columnas del tablero desde CSS.
// mismatchDelay cambia cuanto tardan en ocultarse las cartas incorrectas.
const difficulties = {
  easy: {
    label: "Fácil",
    pairCount: 6,
    columnsClass: "board-easy",
    mismatchDelay: 850
  },
  medium: {
    label: "Medio",
    pairCount: 8,
    columnsClass: "board-medium",
    mismatchDelay: 700
  },
  hard: {
    label: "Difícil",
    pairCount: 10,
    columnsClass: "board-hard",
    mismatchDelay: 550
  }
};

// Variables que guardan el estado actual de la partida.
let deck = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let moves = 0;
let matches = 0;
let seconds = 0;
let timerId = null;
let canPlay = false;
let skippedRegister = false;
let currentDifficulty = "easy";

// Guarda el nombre del usuario que esta jugando.
let currentPlayerName = localStorage.getItem(currentPlayerKey) || "";

// Lee todos los records guardados en este navegador.
function getPlayerRecords() {
  // localStorage solo guarda texto, por eso los records se guardan como JSON.
  const savedRecords = localStorage.getItem(playerRecordsKey);

  // Si todavia no hay records, devolvemos un objeto vacio.
  if (!savedRecords) {
    return {};
  }

  // Convertimos el texto JSON a objeto de JavaScript.
  return JSON.parse(savedRecords);
}

// Guarda todos los records actualizados en este navegador.
function savePlayerRecords(records) {
  // Convertimos el objeto a texto JSON para poder guardarlo.
  localStorage.setItem(playerRecordsKey, JSON.stringify(records));
}

// Obtiene el record del jugador activo.
function getCurrentPlayerBestScore() {
  const records = getPlayerRecords();

  // Si no hay jugador registrado, no hay record que mostrar.
  if (!currentPlayerName) {
    return null;
  }

  // Regresamos el record del usuario actual en la dificultad actual o null si aun no tiene.
  return records[currentPlayerName]?.[currentDifficulty] || null;
}

// Decide si una partida es mejor que el record anterior.
function isNewBestScore(currentScore, previousScore) {
  // Si no hay record anterior, la partida actual se vuelve el primer record.
  if (!previousScore) {
    return true;
  }

  // Menos movimientos es mejor.
  if (currentScore.moves < previousScore.moves) {
    return true;
  }

  // Si hay empate en movimientos, gana quien tenga menos tiempo.
  return currentScore.moves === previousScore.moves && currentScore.seconds < previousScore.seconds;
}

// Guarda el record del jugador actual si la partida fue mejor que su record anterior.
function saveCurrentPlayerScore(score) {
  const records = getPlayerRecords();
  const playerScores = records[currentPlayerName] || {};
  const previousScore = playerScores[currentDifficulty];
  const hasNewBestScore = isNewBestScore(score, previousScore);

  // Si la partida no supera el record anterior, no cambiamos nada.
  if (!hasNewBestScore) {
    return false;
  }

  // Guardamos el nuevo record junto con el nombre del usuario y la dificultad.
  playerScores[currentDifficulty] = {
    name: currentPlayerName,
    difficulty: currentDifficulty,
    difficultyLabel: difficulties[currentDifficulty].label,
    moves: score.moves,
    seconds: score.seconds
  };

  records[currentPlayerName] = playerScores;
  savePlayerRecords(records);
  return true;
}

// Muestra la mejor puntuacion en el panel de estadisticas.
function updateBestScoreDisplay() {
  const bestScore = getCurrentPlayerBestScore();

  // Si no hay record todavia, mostramos "--".
  if (!bestScore) {
    bestScoreElement.textContent = "--";
    return;
  }

  // Mostramos movimientos y tiempo del mejor resultado.
  bestScoreElement.textContent = `${bestScore.moves} mov. / ${formatTime(bestScore.seconds)}`;
}

// Muestra el nombre del jugador actual en el panel lateral.
function updateCurrentPlayerDisplay() {
  currentPlayerElement.textContent = currentPlayerName
    ? `Jugador: ${currentPlayerName}`
    : "Jugador: sin registrar";
}

// Muestra la lista de mejores records guardados.
function updateLeaderboard() {
  const records = getPlayerRecords();

  // Sacamos solamente los records de la dificultad actual.
  const currentDifficultyRecords = Object.values(records)
    .map((playerScores) => playerScores[currentDifficulty])
    .filter(Boolean);

  // Ordenamos los records de la dificultad actual.
  const sortedRecords = currentDifficultyRecords.sort((a, b) => {
    // Primero ordenamos por menos movimientos.
    if (a.moves !== b.moves) {
      return a.moves - b.moves;
    }

    // Si empatan en movimientos, ordenamos por menos tiempo.
    return a.seconds - b.seconds;
  });

  // Si no hay records, mostramos un mensaje sencillo.
  if (sortedRecords.length === 0) {
    leaderboardList.innerHTML = `<li>Aun no hay records en ${difficulties[currentDifficulty].label}</li>`;
    return;
  }

  // Creamos una fila por cada jugador guardado.
  leaderboardList.innerHTML = sortedRecords
    .map((record) => `<li><strong>${record.name}</strong>: ${record.moves} mov. / ${formatTime(record.seconds)}</li>`)
    .join("");
}

// Actualiza todas las partes visuales relacionadas con usuario y records.
function updatePlayerInfo() {
  updateCurrentPlayerDisplay();
  updateBestScoreDisplay();
  updateLeaderboard();
}

// Mezcla las cartas para que aparezcan en posiciones aleatorias.
function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

// Crea la lista de parejas segun la dificultad actual.
function createDifficultyCards() {
  const pairCount = difficulties[currentDifficulty].pairCount;
  const selectedCards = [];

  // Repetimos tus cartas actuales si una dificultad necesita mas parejas que imagenes disponibles.
  // Cuando agregues mas imagenes, puedes meterlas en el arreglo cards y se usaran automaticamente.
  for (let index = 0; index < pairCount; index += 1) {
    const baseCard = cards[index % cards.length];

    // Si una carta se repite, usamos el mismo id para que sus copias puedan formar pareja.
    selectedCards.push(baseCard);
  }

  return selectedCards;
}

// Cambia las clases del tablero para ajustar columnas segun la dificultad.
function updateBoardDifficultyClass() {
  // Quitamos cualquier clase anterior de dificultad.
  board.classList.remove("board-easy", "board-medium", "board-hard");

  // Agregamos la clase correspondiente a la dificultad actual.
  board.classList.add(difficulties[currentDifficulty].columnsClass);
}

// Actualiza el boton visualmente activo de dificultad.
function updateDifficultyButtons() {
  difficultyButtons.forEach((button) => {
    // Marcamos como activo solo el boton que coincide con la dificultad actual.
    button.classList.toggle("is-active", button.dataset.difficulty === currentDifficulty);
  });
}

// Convierte segundos a formato de reloj: 00:00.
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const restSeconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${restSeconds}`;
}

// Inicia el contador de tiempo.
function startTimer() {
  // Si ya hay un temporizador activo, no creamos otro.
  if (timerId) {
    return;
  }

  // Suma 1 segundo cada 1000 milisegundos.
  timerId = setInterval(() => {
    seconds += 1;
    timerElement.textContent = formatTime(seconds);
  }, 1000);
}

// Detiene el contador de tiempo.
function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

// Actualiza los numeros que se ven en pantalla.
function updateStats() {
  movesElement.textContent = moves;
  matchesElement.textContent = matches;
  totalPairsElement.textContent = difficulties[currentDifficulty].pairCount;
  timerElement.textContent = formatTime(seconds);
  updatePlayerInfo();
}

// Crea una carta en HTML usando la informacion del objeto card.
function createCard(card) {
  // La carta es un button para que se pueda hacer clic y tambien usar con teclado.
  const button = document.createElement("button");
  button.className = "card";
  button.type = "button";

  // Guardamos el id en el elemento HTML para comparar cartas despues.
  button.dataset.id = card.id;
  button.setAttribute("aria-label", "Carta oculta");
  button.disabled = true;

  // Creamos el contenido interno de la carta.
  // Los estilos inline permiten ajustar cada imagen desde el arreglo cards.
  button.innerHTML = `
    <span class="card-inner">
      <span class="card-face card-back" aria-hidden="true">?</span>
      <span class="card-face card-front">
        <span class="card-label">
          <img
            class="card-image"
            src="${card.image}"
            alt="${card.title}"
            style="
              width: ${card.size || "102%"};
              height: ${card.size || "102%"};
              object-position: ${card.position || "center"};
              transform: translate(${card.offsetX || "0"}, ${card.offsetY || "0"});
            "
          >
          
        </span>
      </span>
    </span>
  `;

  // Al hacer clic en esta carta, se ejecuta flipCard.
  button.addEventListener("click", () => flipCard(button));
  return button;
}

// Controla lo que pasa cuando el jugador voltea una carta.
function flipCard(cardElement) {
  // Si el usuario aun no cerro la ventana inicial, no puede jugar.
  if (!canPlay) {
    return;
  }

  // Evita clics cuando el tablero esta bloqueado, cuando se repite la misma carta
  // o cuando la carta ya fue encontrada como pareja.
  if (lockBoard || cardElement === firstCard || cardElement.classList.contains("is-matched")) {
    return;
  }

  // El temporizador empieza cuando se voltea la primera carta.
  startTimer();

  // Esta clase activa el giro visual definido en CSS.
  cardElement.classList.add("is-flipped");
  cardElement.setAttribute("aria-label", `Carta ${cardElement.dataset.id}`);

  // Si todavia no hay primera carta, guardamos esta y esperamos la segunda.
  if (!firstCard) {
    firstCard = cardElement;
    return;
  }

  // Si ya habia una primera carta, esta se convierte en la segunda.
  secondCard = cardElement;
  moves += 1;
  updateStats();
  checkForMatch();
}

// Activa el tablero despues de registrar nombre u omitir el registro.
function enableGame() {
  // Marcamos que el usuario ya puede jugar.
  canPlay = true;

  // Habilitamos todas las cartas que aun no estan emparejadas.
  document.querySelectorAll(".card:not(.is-matched)").forEach((card) => {
    card.disabled = false;
  });

  // Cerramos el modal inicial si esta abierto.
  if (registerDialog.open) {
    registerDialog.close();
  }
}

// Muestra el modal inicial la primera vez que el usuario entra sin nombre guardado.
function showRegisterDialog() {
  // Si ya hay un nombre guardado, dejamos jugar directamente.
  if (currentPlayerName || skippedRegister) {
    enableGame();
    return;
  }

  // Si no hay nombre guardado, abrimos la ventana de registro.
  if (typeof registerDialog.showModal === "function") {
    registerDialog.showModal();
  }
}

// Compara las dos cartas seleccionadas.
function checkForMatch() {
  const isMatch = firstCard.dataset.id === secondCard.dataset.id;

  // Si tienen el mismo id, forman pareja.
  if (isMatch) {
    keepMatchedCards();
    return;
  }

  // Si no coinciden, se ocultan de nuevo.
  hideCards();
}

// Mantiene visibles las cartas que si formaron pareja.
function keepMatchedCards() {
  firstCard.classList.add("is-matched", "is-disabled");
  secondCard.classList.add("is-matched", "is-disabled");

  // Desactivamos los botones para que no se puedan volver a presionar.
  firstCard.disabled = true;
  secondCard.disabled = true;
  matches += 1;
  updateStats();
  resetTurn();

  // Si encontramos todas las parejas de la dificultad actual, termina la partida.
  if (matches === difficulties[currentDifficulty].pairCount) {
    finishGame();
  }
}

// Oculta dos cartas cuando no coinciden.
function hideCards() {
  // Bloqueamos el tablero mientras las cartas estan visibles por un momento.
  lockBoard = true;

  // Espera un tiempo distinto segun la dificultad antes de voltearlas otra vez.
  setTimeout(() => {
    firstCard.classList.remove("is-flipped");
    secondCard.classList.remove("is-flipped");
    firstCard.setAttribute("aria-label", "Carta oculta");
    secondCard.setAttribute("aria-label", "Carta oculta");
    resetTurn();
  }, difficulties[currentDifficulty].mismatchDelay);
}

// Limpia la seleccion actual para poder elegir otro par de cartas.
function resetTurn() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

// Se ejecuta cuando el jugador encuentra todas las parejas.
function finishGame() {
  stopTimer();

  // Guardamos los datos de la partida actual para compararlos con el record.
  const currentScore = {
    moves: moves,
    seconds: seconds
  };

  // Solo guardamos record si el usuario registro su nombre.
  const hasNewBestScore = currentPlayerName
    ? saveCurrentPlayerScore(currentScore)
    : false;

  // Actualizamos el texto visible del usuario, record y tabla.
  updatePlayerInfo();

  // Mostramos un mensaje diferente segun el estado del jugador y su record.
  if (!currentPlayerName) {
    finalScore.textContent = `Completaste el tablero en ${moves} movimientos y ${formatTime(seconds)}. Registra tu nombre para guardar tu record.`;
  } else if (hasNewBestScore) {
    finalScore.textContent = `Nuevo record de ${currentPlayerName}: ${moves} movimientos y ${formatTime(seconds)}.`;
  } else {
    finalScore.textContent = `Completaste el tablero en ${moves} movimientos y ${formatTime(seconds)}.`;
  }

  // showModal abre la ventana emergente de victoria.
  if (typeof winDialog.showModal === "function") {
    winDialog.showModal();
  }
}

// Reinicia la partida desde cero.
function restartGame() {
  stopTimer();

  // Creamos las cartas de la dificultad actual.
  const difficultyCards = createDifficultyCards();

  // Duplicamos las cartas para tener pares y luego mezclamos el resultado.
  deck = shuffle([...difficultyCards, ...difficultyCards]);

  // Reiniciamos todas las variables del juego.
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  canPlay = Boolean(currentPlayerName);
  moves = 0;
  matches = 0;
  seconds = 0;

  // Borramos las cartas actuales del tablero.
  board.innerHTML = "";

  // Ajustamos columnas y boton activo segun la dificultad actual.
  updateBoardDifficultyClass();
  updateDifficultyButtons();

  // Creamos y agregamos cada carta nueva al tablero.
  deck.forEach((card) => {
    board.appendChild(createCard(card));
  });

  updateStats();

  // Si el modal de victoria esta abierto, lo cerramos.
  if (winDialog.open) {
    winDialog.close();
  }

  // Si no hay jugador guardado, volvemos a pedir registro antes de jugar.
  showRegisterDialog();
}

// Conectamos los botones del HTML con la funcion de reiniciar.
restartButton.addEventListener("click", restartGame);
playAgainButton.addEventListener("click", restartGame);

// Cambia la dificultad cuando el usuario presiona un boton de dificultad.
difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Guardamos la dificultad elegida desde el atributo data-difficulty del boton.
    currentDifficulty = button.dataset.difficulty;

    // Reiniciamos la partida para crear el tablero con la nueva dificultad.
    restartGame();
  });
});

// Guardamos el nombre cuando el usuario envia el formulario.
playerForm.addEventListener("submit", (event) => {
  // Evita que el formulario recargue la pagina.
  event.preventDefault();

  // trim quita espacios al inicio y final del texto.
  const typedName = playerNameInput.value.trim();

  // Si el usuario no escribio nada, no hacemos cambios.
  if (!typedName) {
    return;
  }

  // Guardamos el nombre como jugador actual.
  currentPlayerName = typedName;
  localStorage.setItem(currentPlayerKey, currentPlayerName);

  // Limpiamos el input para que se vea ordenado.
  playerNameInput.value = "";

  // Actualizamos nombre visible, mejor puntuacion y tabla de records.
  updatePlayerInfo();

  // Cerramos el modal y habilitamos el tablero.
  enableGame();
});

// Permite jugar sin registrar nombre.
skipRegisterButton.addEventListener("click", () => {
  // Dejamos el nombre vacio para que no se guarde record personal.
  currentPlayerName = "";
  skippedRegister = true;
  localStorage.removeItem(currentPlayerKey);

  // Actualizamos la interfaz y dejamos jugar.
  updatePlayerInfo();
  enableGame();
});

// Inicia el juego automaticamente cuando carga el archivo.
restartGame();
