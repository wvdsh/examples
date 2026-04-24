import { Game as MainGame } from './scenes/Game';
import { AUTO, Game, Scale } from 'phaser';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config = {
    type: AUTO,
    parent: 'game-container',
    backgroundColor: '#111111',
    scale: {
        mode: Scale.RESIZE,
        width: window.innerWidth,
        height: window.innerHeight
    },
    scene: [
        MainGame
    ]
};

const StartGame = (parent) => {

    return new Game({ ...config, parent });

}

export default StartGame;
