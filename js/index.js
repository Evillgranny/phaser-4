import Phaser from 'phaser';

// create a new scene
let gameScene = new Phaser.Scene('Game');

// some parameters for our scene
gameScene.init = function() {
    // player parameters
    this.playerSpeed = 150;
    this.jumpSpeed = -600;
};

// load asset files for our game
gameScene.preload = function() {
    // load images
    this.load.image('ground', 'assets/images/ground.png');
    this.load.image('platform', 'assets/images/platform.png');
    this.load.image('block', 'assets/images/block.png');
    this.load.image('goal', 'assets/images/gorilla3.png');
    this.load.image('barrel', 'assets/images/barrel.png');

    // load spritesheets
    this.load.spritesheet('player', 'assets/images/player_spritesheet.png', {
        frameWidth: 28,
        frameHeight: 30,
        margin: 1,
        spacing: 1
    });

    this.load.spritesheet('fire', 'assets/images/fire_spritesheet.png', {
        frameWidth: 20,
        frameHeight: 21,
        margin: 1,
        spacing: 1
    });

    this.load.json('levelData', 'assets/json/levelData.json');
};

// executed once, after assets were loaded
gameScene.create = function() {
    // walking animation
    if (!this.anims.get('walking')) {
        this.anims.create({
            key: 'walking',
            frames: this.anims.generateFrameNames('player', {
                frames: [0, 1, 2]
            }),
            frameRate: 12,
            yoyo: true,
            repeat: -1
        });
    }

    if (!this.anims.get('burning')) {
        this.anims.create({
            key: 'burning',
            frames: this.anims.generateFrameNames('fire', {
                frames: [0, 1]
            }),
            frameRate: 4,
            repeat: -1
        });
    }

    // add all level elements
    this.setupLevel();

    // setup spawner
    this.setupSpawner();

    this.physics.add.collider([this.player, this.goal, this.barrels], this.platforms);

    // overlap checks
    this.physics.add.overlap(this.player, [this.fires, this.goal, this.barrels], this.restartGame, null, this);

    // // adding existing sprite to the physics system
    // const ground = this.add.sprite(180, 604, 'ground');
    // this.physics.add.existing(ground, true);
    // this.platfroms.add(ground)
    //
    // // ground.body.allowGravity = false;

    // const platform = this.add.tileSprite(176, 384, 4 * 36, 1 * 30, 'block');
    // this.physics.add.existing(platform, true);

    // // collision detection
    // this.physics.add.collider(this.player, this.platforms);

    // enable cursor keys
    this.coursors = this.input.keyboard.createCursorKeys();

    // ground.body.immovable = true;

    // creating and adding a sprite to the physics system
    // const ground2 = this.physics.add.sprite(180, 200, 'ground');

    // collision detection
    // this.physics.add.collider(ground, ground2);
};

gameScene.update = function () {
    // are we on the ground?
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;

    if (this.coursors.left.isDown && !this.coursors.right.isDown) {
        this.player.body.setVelocityX(-this.playerSpeed);

        this.player.flipX = false;

        if (onGround && !this.player.anims.isPlaying) {
            this.player.anims.play('walking');
        }
    } else if (this.coursors.right.isDown && !this.coursors.left.isDown) {
        this.player.body.setVelocityX(this.playerSpeed);

        this.player.flipX = true;

        if (onGround && !this.player.anims.isPlaying) {
            this.player.anims.play('walking');
        }
    } else {
        // make the player stop
        this.player.body.setVelocityX(0);

        // stop the animation
        this.player.anims.stop('walking');

        // set default frame
        if (onGround) {
            this.player.setFrame(3);
        }
    }

    // handle jumping
    if (onGround && (this.coursors.space.isDown || this.coursors.up.isDown)) {
        // give the player a velocity in Y
        this.player.body.setVelocityY(this.jumpSpeed);

        // stop the walking animation
        this.player.anims.stop('walking');

        // change the frame to jump
        this.player.setFrame(2);
    }
}

gameScene.setupLevel = function () {
    this.platforms = this.physics.add.staticGroup();

    this.levelData = this.cache.json.get('levelData');

    this.physics.world.bounds.width = this.levelData.world.width;
    this.physics.world.bounds.height = this.levelData.world.height;
    // camera bounds


    // create all the platforms
    this.levelData.platforms.forEach((platform) => {
        let newObject
        if (platform.numTiles === 1) {
            newObject = this.add.sprite(platform.x, platform.y, platform.key).setOrigin(0);
        } else {
            const width = this.textures.get(platform.key).get(0).width;
            const height = this.textures.get(platform.key).get(0).height;
            // create tileSprite
            newObject = this.add.tileSprite(platform.x, platform.y, platform.numTiles * width, height, platform.key)
                .setOrigin(0)
        }

        // enable physics
        this.physics.add.existing(newObject, true);
        this.platforms.add(newObject);
    });

    // fires
    this.fires = this.physics.add.group({
        allowGravity: false,
        immovable: true
    });

    // create all the platforms
    this.levelData.fires.forEach((fire) => {
        const newObject = this.add.sprite(fire.x, fire.y, 'fire').setOrigin(0);

        newObject.anims.play('burning');

        this.fires.add(newObject);
    });

    this.player = this.add.sprite(this.levelData.player.x, this.levelData.player.y, 'player', 3);
    this.physics.add.existing(this.player);

    // constraint player to the game bounds
    this.player.body.setCollideWorldBounds(true);

    this.goal = this.add.sprite(this.levelData.goal.x, this.levelData.goal.y, 'goal');
    this.physics.add.existing(this.goal);

    this.cameras.main.setBounds(0, 0, this.levelData.world.width, this.levelData.world.height);
    this.cameras.main.startFollow(this.player);
}

// restart game (game over + you won!)
gameScene.restartGame = function (sourceSprite, targetSprite) {
    // fade out
    this.cameras.main.fade(500);

    // when fade out completes, restart the Scene
    this.cameras.main.on('camerafadeoutcomplete', function (camera, effect) {
        // restart the Scene
        this.scene.restart();
    }, this);
}

gameScene.setupSpawner = function () {
    // barrel group
    this.barrels = this.physics.add.group({
        bounceY: 0.1,
        bounceX: 1,
        collideWorldBounds: true
    });

    // spawn barrels
    const spawningEvent = this.time.addEvent({
        delay: this.levelData.spawner.interval,
        loop: true,
        callbackScope: this,
        callback: function(){
            // create a barrel
            let barrel = this.barrels.get(this.goal.x, this.goal.y, 'barrel');

            // reactivate
            barrel.setActive(true);
            barrel.setVisible(true);
            barrel.body.enable = true;

            // set properties
            barrel.setVelocityX(this.levelData.spawner.speed);

            //console.log(this.barrels.getChildren().length);

            // lifespan
            this.time.addEvent({
                delay: this.levelData.spawner.lifespan,
                repeat: 0,
                callbackScope: this,
                callback: function(){
                    this.barrels.killAndHide(barrel);
                    barrel.body.enable = false;
                }
            });
        }
    });
}

// our game's configuration
let config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    scene: gameScene,
    title: 'Monster Kong',
    pixelArt: false,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false,
        }
    }
};

// create the game, and pass it the configuration
let game = new Phaser.Game(config);
