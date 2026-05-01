const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const canvas = createCanvas(1200, 400); // taller canvas = more breathing room
const ctx = canvas.getContext('2d');

// Transparent background
ctx.fillStyle = 'rgba(0,0,0,0)';
ctx.fillRect(0, 0, 1200, 400);

// "from" text
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = '400 55px sans-serif';
ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
ctx.fillText('from', 600, 80); // pushed higher for more gap

// "Genies Slides" text
ctx.font = '300 96px sans-serif';
const t1 = 'Genies';
const t2 = 'Slides';
const gap = 28;

const w1 = ctx.measureText(t1).width;
const w2 = ctx.measureText(t2).width;
const totalW = w1 + gap + w2;

const startX = 600 - (totalW / 2);

// Create Gradient
const gradient = ctx.createLinearGradient(startX, 0, startX + totalW, 0);
gradient.addColorStop(0, '#60A5FA'); // Bright blue
gradient.addColorStop(1, '#34D399'); // Bright emerald green

ctx.textAlign = 'left';
ctx.fillStyle = gradient;
ctx.fillText(t1, startX, 300); // more vertical gap from "from"
ctx.fillText(t2, startX + w1 + gap, 300);

const buffer = canvas.toBuffer('image/png');
const outPath = path.join(__dirname, 'android/app/src/main/res/drawable/branding.png');
fs.writeFileSync(outPath, buffer);
console.log('Branding image created successfully at:', outPath);