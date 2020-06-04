/*
 *  main.js
 */

phina.globalize();
const WEBRTC_API_KEY = "b876a85f-f1b4-4412-bb13-cdac5986f0c1";

const DEBUG_COLLISION = false;

const SCREEN_WIDTH = 1024 / 2;
const SCREEN_HEIGHT = 768 / 2;
const SCREEN_WIDTH_HALF = SCREEN_WIDTH * 0.5;
const SCREEN_HEIGHT_HALF = SCREEN_HEIGHT * 0.5;

const SCREEN_OFFSET_X = 0;
const SCREEN_OFFSET_Y = 0;

const NUM_LAYERS = 8;
const LAYER_FOREGROUND = 7;
const LAYER_DEBUG = 6;
const LAYER_COLLISION = 5;
const LAYER_ENEMY = 4;
const LAYER_PLAYER = 3;
const LAYER_OBJECT = 2;
const LAYER_BACKGROUND = 1;
const LAYER_MAP = 0;

let phina_app;

window.onload = function() {
  phina_app = Application();
  phina_app.replaceScene(FirstSceneFlow({}));
  phina_app.run();
};

//スクロール禁止
// document.addEventListener('touchmove', function(e) {
//  e.preventDefault();
// }, { passive: false });

//Androidブラウザバックボタン制御
// document.addEventListener("backbutton", function(e){
//   e.preventDefault();
// }, false);