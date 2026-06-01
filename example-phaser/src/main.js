import StartGame from './game/main';

document.addEventListener('DOMContentLoaded', async () => {

    const Wavedash = await window.Wavedash;

    // No async assets — staged ramp: Phaser booting (0.5), game ready via postBoot (1→init)
    Wavedash.updateLoadProgressZeroToOne(0.5);
    StartGame('game-container', Wavedash);

});
