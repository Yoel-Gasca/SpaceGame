// -Add Motion-
// EventEmitter para publicar y suscribirse a mensajes
let gameLoopId;
class EventEmitter {
	constructor() {
		this.listeners = {};
	}

	on(message, listener) {
		if (!this.listeners[message]) {
			this.listeners[message] = [];
		}
		this.listeners[message].push(listener);
	}

	emit(message, payload = null) {
		if (this.listeners[message]) {
			this.listeners[message].forEach((l) => l(message, payload));
		}
	}

	// Limpia la suscripción y publicación de mensajes
	clear() {
		this.listeners = {};
	}
}

// Agrega objetos dedicados 
class GameObject {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.dead = false;
		this.type = '';
		this.width = 0;
		this.height = 0;
		this.img = undefined;
	}

	draw(ctx) {
		ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
	}

	// Configura una representación rectangular del objeto de juego, para manejar la colisión
	rectFromGameObject() {
		return {
		  top: this.y,
		  left: this.x,
		  bottom: this.y + this.height,
		  right: this.x + this.width,
		};
	  }
}

// GameObject para crear el héroe y los enemigos.
class Hero extends GameObject {
	constructor(x, y) {
		super(x, y);
		(this.width = 99), (this.height = 75);
		this.type = 'Hero';
		this.speed = { x: 0, y: 0 };
		this.cooldown = 0;
		//  establece la vida y los puntos
		this.life = 3;
		this.points = 0;
	}

	// Cooldown de los disparos del heroe
	fire() {
		gameObjects.push(new Laser(this.x + 45, this.y - 10));
		this.cooldown = 500;

		let id = setInterval(() => {
			if (this.cooldown > 0) {
				this.cooldown -= 100;
				if(this.cooldown === 0) {
					clearInterval(id);
				}
			}
		}, 200);
	}
	canFire() {
		return this.cooldown === 0;
	}

	// Por cada colisión entre héroes y enemigos, resta una vida
	decrementLife() {
		this.life--;
		if (this.life === 0) {
			this.dead = true;
		}
	}

	//Por cada láser que golpea a un enemigo, aumenta la puntuación del juego con 100 puntos.
	incrementPoints() {
		this.points += 100;
	}
}

// Crear enemigos
class Enemy extends GameObject {
	constructor(x, y) {
		super(x, y);
		(this.width = 98), (this.height = 50);
		this.type = 'Enemy';
		let id = setInterval(() => {
			if (this.y < canvas.height - this.height) {
				this.y += 5;
			} else {
				console.log('Stopped at', this.y);
				clearInterval(id);
			}
		}, 300);
	}
}

// Láser se mueve gradualmente hacia la parte superior de la pantalla.
class Laser extends GameObject {
	constructor(x, y) {
		super(x, y);
	  	(this.width = 9), (this.height = 33);
	  	this.type = 'Laser';
	  	this.img = laserImg;
	  	let id = setInterval(() => {
			if (this.y > 0) {
				this.y -= 15;
			} else {
				this.dead = true;
				clearInterval(id);
			}
		}, 100);
	}
}

// -Drawing to canvas-
function loadTexture(path) {
	return new Promise((resolve) => {
		const img = new Image();
		img.src = path;
		img.onload = () => {
			resolve(img);
		};
	});
}

// Código que verifica la colisión
function intersectRect(r1, r2) {
	return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
  }

// Agrega constantes y configura el EventEmitter:
const Messages = {
	KEY_EVENT_ENTER: 'KEY_EVENT_ENTER',
	KEY_EVENT_UP: 'KEY_EVENT_UP',
	KEY_EVENT_DOWN: 'KEY_EVENT_DOWN',
	KEY_EVENT_LEFT: 'KEY_EVENT_LEFT',
	KEY_EVENT_RIGHT: 'KEY_EVENT_RIGHT',
	KEY_EVENT_SPACE: 'KEY_EVENT_SPACE',
	COLLISION_ENEMY_LASER: 'COLLISION_ENEMY_LASER',
	COLLISION_ENEMY_HERO: 'COLLISION_ENEMY_HERO',
	GAME_END_LOSS: 'GAME_END_LOSS',
	GAME_END_WIN: 'GAME_END_WIN',
};

let heroImg,
	enemyImg,
	laserImg, // laser
	canvas,
	ctx,
	gameObjects = [],
	hero,
	eventEmitter = new EventEmitter();

// EVENTS
let onKeyDown = function (e) {
	console.log(e.keyCode);
	switch (e.keyCode) {
		case 37:
		case 39:
		case 38:
		case 40: // Arrow keys
		case 32:
			e.preventDefault();
			break; // Space
		default:
			break; // do not block other keys
	}
};

window.addEventListener('keydown', onKeyDown);

// Agrega un detector de eventos en la ventana:
// TODO make message driven
window.addEventListener('keyup', (evt) => {
	if (evt.key === 'ArrowUp') {
		eventEmitter.emit(Messages.KEY_EVENT_UP);
	} else if (evt.key === 'ArrowDown') {
		eventEmitter.emit(Messages.KEY_EVENT_DOWN);
	} else if (evt.key === 'ArrowLeft') {
		eventEmitter.emit(Messages.KEY_EVENT_LEFT);
	} else if (evt.key === 'ArrowRight') {
		eventEmitter.emit(Messages.KEY_EVENT_RIGHT);
	}else if(evt.keyCode === 32) {
		eventEmitter.emit(Messages.KEY_EVENT_SPACE);
	}else if (evt.key === 'Enter') {
		eventEmitter.emit(Messages.KEY_EVENT_ENTER); //Código que reinicia el juego con solo presionar un botón seleccionado.
	}
});

// Mover enemigos en un cierto intervalo
function createEnemies() {
	const MONSTER_TOTAL = 5;
	const MONSTER_WIDTH = MONSTER_TOTAL * 98;
	const START_X = (canvas.width - MONSTER_WIDTH) / 2;
	const STOP_X = START_X + MONSTER_WIDTH;

	for (let x = START_X; x < STOP_X; x += 98) {
		for (let y = 0; y < 50 * 5; y += 50) {
			const enemy = new Enemy(x, y);
			enemy.img = enemyImg;
			gameObjects.push(enemy);
		}
	}
}

// Proceso similar para el héroe.
function createHero() {
	hero = new Hero(canvas.width / 2 - 45, canvas.height - canvas.height / 4);
	hero.img = heroImg;
	gameObjects.push(hero);
}

// Manejar colisiones, implementar reglas de colisión para el láser
function updateGameObjects() {
	const enemies = gameObjects.filter((go) => go.type === 'Enemy');
	const lasers = gameObjects.filter((go) => go.type === 'Laser');

	// Manejar las colisiones enemigas
	enemies.forEach((enemy) => {
		const heroRect = hero.rectFromGameObject();
		if (intersectRect(heroRect, enemy.rectFromGameObject())) {
			eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy });
		}
	});

  // laser hit something
	lasers.forEach((l) => {
		enemies.forEach((m) => {
			if (intersectRect(l.rectFromGameObject(), m.rectFromGameObject())) {
				eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, {
					first: 2,
					second: m,
				});
			}
		});
	});
	
	gameObjects = gameObjects.filter((go) => !go.dead);
}  

// función para comenzar el dibujo
function drawGameObjects(ctx) {
	gameObjects.forEach((go) => go.draw(ctx));
}

// Inicializa el juego
function initGame() {
	gameObjects = [];
	createEnemies();
	createHero();

	// Reinicia el juego
	eventEmitter.on(Messages.KEY_EVENT_ENTER, () => {
		resetGame();
	});

	// Agregar oyentes de eventos
	eventEmitter.on(Messages.KEY_EVENT_UP, () => {
		hero.y -= 10;
	});

	eventEmitter.on(Messages.KEY_EVENT_DOWN, () => {
		hero.y += 10;
	});

	eventEmitter.on(Messages.KEY_EVENT_LEFT, () => {
		hero.x -= 10;
	});

	eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => {
		hero.x += 10;
	});

	// Oyente para asegurarse de que el héroe pueda disparar cuando se presione la tecla de espacio
	eventEmitter.on(Messages.KEY_EVENT_SPACE, () => {
		if (hero.canFire()) {
			hero.fire();
		}
		// console.log('cant fire - cooling down')
	});

	// Detectar colision del laser
	eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { first, second }) => {
		first.dead = true;
		second.dead = true;
		hero.incrementPoints();

		if (isEnemiesDead()) {
			eventEmitter.emit(Messages.GAME_END_WIN);
		}
	});

	// Detectar la colision del heroe con el enemigo
	eventEmitter.on(Messages.COLLISION_ENEMY_HERO, (_, { enemy }) => {
		enemy.dead = true;
		hero.decrementLife();
		if (isHeroDead()) {
			eventEmitter.emit(Messages.GAME_END_LOSS);
			return; // loss before victory
		}
		if (isEnemiesDead()) {
			eventEmitter.emit(Messages.GAME_END_WIN);
		}
	});

	eventEmitter.on(Messages.GAME_END_WIN, () => {
		endGame(true);
	});
	eventEmitter.on(Messages.GAME_END_LOSS, () => {
		endGame(false);
	});

	
}

// Finaliza el juego en caso de destruir los objetivos o en caso de perder todas las vidas 
function endGame(win) {
	clearInterval(gameLoopId);

	// set delay so we are sure any paints have finished
	setTimeout(() => {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		if (win) {
			displayMessage('¡Victoria - Presiona [Enter] para iniciar un nuevo juego Capitan!', 'green');
		} else {
			displayMessage('Has muerto Presiona [Enter] para volver a intentarlo Capitan');
		}
	}, 200);
}

// Verifica si el barco héroe ha sido destruido 
function isHeroDead() {
	return hero.life <= 0;
}

// Seguimiento de la cantidad de enemigos destruidos
function isEnemiesDead() {
	const enemies = gameObjects.filter((go) => go.type === 'Enemy' && !go.dead);
	return enemies.length === 0;
}

// Dibuja estos valores en la pantalla
function drawLife() {
	// TODO, 35, 27
	//

	const START_POS = canvas.width - 180;
	for (let i = 0; i < hero.life; i++) {
		ctx.drawImage(lifeImg, START_POS + 45 * (i + 1), canvas.height - 37);
	}
}

// Dibuja el puntaje
function drawPoints() {
	ctx.font = '30px Arial';
	ctx.fillStyle = 'red';
	ctx.textAlign = 'left';
	drawText('Points: ' + hero.points, 10, canvas.height - 20);
}
// Dibuja el texto de mensaje
function drawText(message, x, y) {
	ctx.fillText(message, x, y);
}

// Muestra un mensaje de victoria.
function displayMessage(message, color = 'red') {
	ctx.font = '30px Arial';
	ctx.fillStyle = color;
	ctx.textAlign = 'center';
	ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

// Verifica si se pierdan todas las vidas o el jugador haya ganado el juego, muestre que el juego se puede reiniciar.
function resetGame() {
	if (gameLoopId) {
		clearInterval(gameLoopId);
		eventEmitter.clear();
		initGame();
		gameLoopId = setInterval(() => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = 'black';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			drawPoints();
			drawLife();
			updateGameObjects();
			drawGameObjects(ctx);
		}, 100);
	}
}


// Configura el bucle del juego
window.onload = async () => {
	canvas = document.getElementById('canvas');
	ctx = canvas.getContext('2d');
	heroImg = await loadTexture('assets/player.png'); // heroe
	enemyImg = await loadTexture('assets/enemyShip.png'); // enemigo
	laserImg = await loadTexture('assets/laserRed.png'); // laser
	lifeImg = await loadTexture('assets/life.png'); // life

	initGame();
	gameLoopId = setInterval(() => {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		// Agregar métodos al bucle del juego.
		drawPoints();
		drawLife();
		updateGameObjects();
		drawGameObjects(ctx);
	}, 100);
};
