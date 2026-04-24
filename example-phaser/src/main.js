import StartGame from './game/main';

document.addEventListener('DOMContentLoaded', async () => {

    const Wavedash = await window.Wavedash;

    StartGame('game-container');

    Wavedash.updateLoadProgressZeroToOne(1);
    Wavedash.init({ debug: true });

});
