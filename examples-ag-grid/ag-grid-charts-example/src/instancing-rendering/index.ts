import { Scene } from 'ag-charts-community/src/scene/scene';
import { Group } from 'ag-charts-community/src/scene/group';
import { Path } from 'ag-charts-community/src/scene/shape/path';
import { Color } from 'ag-charts-community/src/util/color';
import { Shape } from 'ag-charts-community/src/scene/shape/shape';
import { Rect } from 'ag-charts-community/src/scene/shape/rect';
import { FpsCounter } from 'ag-charts-community/src/scene/fpsCounter';

const fpsCounter = new FpsCounter(document.body);

function spirograph(steps = 1440): { x: number; y: number; color: string }[] {
  const allCoefficients = [
    [1, 1, 0, 100],
    [3, 5, 5, 60],
    [2, 2, 2, 100],
    [3, 3, 3, 40],
    [3, 3, 4, 40],
    [3, 7, 2, 40],
  ];

  const coefficients = allCoefficients[1];
  const a = coefficients[0];
  const b = coefficients[1];
  const k = coefficients[2];
  const scale = coefficients[3];

  const pi2 = Math.PI * 2;
  const increment = pi2 / steps;
  const dataset = [];

  for (let theta = 0; theta < pi2; theta += increment) {
    const r = a * scale + b * scale * Math.cos(k * theta);
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    const color = Color.fromHSB(theta * 180, 1, 1).toHexString();

    dataset.push({ x, y, color });
  }

  return dataset;
}

function memorySizeOf(obj: any) {
  var bytes = 0;

  function sizeOf(obj: any) {
    if (obj !== null && obj !== undefined) {
      switch (typeof obj) {
        case 'number':
          bytes += 8;
          break;
        case 'string':
          bytes += obj.length * 2;
          break;
        case 'boolean':
          bytes += 4;
          break;
        case 'object':
          var objClass = Object.prototype.toString.call(obj).slice(8, -1);
          if (objClass === 'Object' || objClass === 'Array') {
            for (var key in obj) {
              if (!obj.hasOwnProperty(key)) continue;
              sizeOf(obj[key]);
            }
          } else bytes += obj.toString().length * 2;
          break;
      }
    }
    return bytes;
  }

  function formatByteSize(bytes: any) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(3) + ' KiB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(3) + ' MiB';
    else return (bytes / 1073741824).toFixed(3) + ' GiB';
  }

  return formatByteSize(sizeOf(obj));
}

document.addEventListener('DOMContentLoaded', () => {
  const width = 1200;
  const height = 1200;
  const centerX = width / 2;
  const centerY = height / 2;
  const scene = new Scene();
  scene.resize(width, height);
  scene.renderFrameIndex = true;
  scene.container = document.body;
  const rootGroup = new Group();

  const starPath =
    'M 54.479341,8.93861 63.990133,35.839945 65.664178,40.57499 99.20847,41.43623 72.576788,61.8498 82.123461,94.0185 54.47934,74.9984 26.835216,94.0185 36.381891,61.8498 9.7502099,41.43623 43.294501,40.575 z';
  const dogPath =
    'M196.694,108.538c-0.919,1.47 -2.603,9.861 -2.144,18.711c0.46,8.881 0.888,16.629 1.378,21.253c0.46,4.655 0.858,10.289 0.919,12.464c0.092,2.174 1.47,6.951 1.868,9.125c0.398,2.175 1.47,6.033 3.001,6.431c1.531,0.398 4.104,0.092 5.022,0.766c0.919,0.704 2.022,1.868 2.542,3.093c0.551,1.225 1.011,1.868 1.011,1.868c0,0 2.48,0.918 2.695,1.47c0.245,0.551 -0.919,0.551 -1.562,0.551c-0.613,0 -1.164,0 -1.164,0c0,0 0.398,1.011 -1.164,1.164c-1.561,0.153 -2.541,0 -2.541,0c0,0 -0.919,0.704 -2.481,0.612c-1.562,-0.092 -6.89,-0.612 -7.962,-1.562c-1.072,-0.918 -2.082,-3.95 -2.174,-5.879c-0.092,-1.93 -2.021,-5.727 -2.94,-7.809c-0.919,-2.083 -1.225,-3.185 -2.236,-3.491c-1.01,-0.307 -2.786,-0.919 -2.786,-2.175c0,-1.225 0.704,-1.776 0.704,-1.776c0,0 -0.398,-1.378 -0.919,-4.256c-0.551,-2.848 -2.082,-12.985 -2.633,-16.017c-0.551,-3.001 -4.257,-20.027 -4.257,-20.027l-0.919,-3.246c0,0 -5.726,20.732 -6.339,24.743c-0.612,4.012 -1.776,11.147 -2.082,13.383c-0.306,2.235 -1.47,9.371 -1.623,12.065c-0.153,2.695 0,8.82 0.704,9.831c0.705,1.01 3.185,0.765 4.318,1.224c1.164,0.46 1.715,0.919 2.542,2.542c0.857,1.623 1.225,2.328 1.225,2.328c0,0 1.929,0.918 1.868,1.715c-0.092,0.765 -1.929,0.306 -1.929,0.306c0,0 -0.552,2.082 -1.868,2.235c-1.317,0.153 -4.318,0 -4.318,0c0,0 -1.715,0.306 -3.859,0.153c-2.174,-0.153 -2.327,-1.316 -2.327,-1.316c0,0 -2.481,-0.46 -3.185,-2.481c-0.704,-2.021 -0.398,-5.022 -0.245,-6.339c0.153,-1.317 -0.092,-2.327 -0.306,-3.491c-0.245,-1.164 -1.225,-7.564 -1.47,-8.207c-0.245,-0.613 0.153,-0.459 -0.858,-1.011c-1.01,-0.551 -1.715,-1.623 -1.561,-2.695c0.153,-1.071 0.153,-0.398 0.306,-2.082c0.153,-1.715 1.225,-5.175 1.317,-7.105c0.091,-1.929 1.225,-13.994 1.225,-15.158c0,-1.164 1.316,-19.844 1.316,-21.038c0,-1.195 -0.275,-6.033 -0.275,-6.033c0,0 -17.547,-3.063 -27.837,-8.269c-10.289,-5.206 -23.488,-8.36 -26.183,-9.922c-2.695,-1.592 -18.282,-7.625 -18.282,-7.625c0,0 -3.614,0.919 -4.839,7.809c-1.194,6.86 -2.97,15.404 -5.389,19.201c-2.42,3.797 -6.768,9.003 -10.688,15.128c-3.889,6.125 -8.911,12.249 -10.014,18.374c-1.102,6.125 -1.47,7.319 -0.918,11.423c0.551,4.073 1.684,7.625 1.959,8.819c0.276,1.194 1.623,0.949 3.032,0.827c1.439,-0.123 2.94,-0.49 4.226,1.164c1.286,1.653 2.848,3.093 2.848,3.093c0,0 1.439,0.275 2.052,1.01c0.612,0.735 -0.031,0.582 -1.072,0.613c-1.041,0.03 -1.01,0.03 -1.01,0.03c0,0 0.275,1.286 -1.501,1.47l-1.776,0.184c0,0 -1.96,0.551 -3.522,0.398c-1.562,-0.153 -1.317,-0.337 -1.5,-0.551c-0.184,-0.184 -1.378,0.582 -3.553,0.459c-2.143,-0.122 -3.644,-0.98 -4.287,-1.807c-0.643,-0.826 -0.184,-2.388 -0.459,-3.368c-0.276,-0.98 -0.919,-3.706 -1.225,-5.972c-0.276,-2.266 -2.695,-8.207 -2.848,-10.044c-0.153,-1.868 -0.613,-5.88 -1.133,-8.054c-0.521,-2.174 -2.266,-5.574 -0.919,-7.687c1.347,-2.113 7.748,-11.912 8.666,-14.576c0.919,-2.695 0.888,-3.185 0.888,-3.185c0,0 -6.43,6.339 -8.145,8.36c-1.715,2.021 -10.504,11.239 -13.291,16.812c-2.787,5.574 -4.532,9.524 -4.9,13.291c-0.367,3.766 -0.52,7.319 -0.459,8.299c0.061,0.98 -0.061,1.562 0.674,3.031c0.735,1.501 2.266,1.501 3.307,1.96c1.041,0.46 1.439,0.245 2.113,2.358c0.674,2.113 0.398,2.205 1.654,2.787c1.225,0.582 2.327,1.715 1.715,1.807c-0.613,0.092 -1.96,-0.245 -1.96,-0.245c0,0 0.214,1.041 -0.827,1.592c-1.041,0.582 -1.96,0.215 -1.96,0.215c0,0 -1.133,0.612 -3.032,0.367c-1.898,-0.245 -2.695,-0.398 -2.695,-0.398c0,0 -1.224,0.398 -2.48,0.092c-1.225,-0.306 -2.174,-1.501 -2.511,-1.715c-0.337,-0.214 -0.337,-0.245 -0.337,-0.245c0,0 -1.807,-1.501 -1.991,-2.695c-0.183,-1.194 0.062,-2.664 -0.275,-3.522c-0.337,-0.888 -0.796,-1.194 -0.337,-3.215c0.459,-2.052 1.317,-9.279 1.746,-12.249c0.428,-2.971 1.071,-10.81 1.071,-11.821c0,-1.011 0,-3.767 0,-5.451c0,-1.684 0.184,-2.205 1.348,-3.583c1.163,-1.378 6.216,-5.42 9.616,-12.066c3.399,-6.645 4.379,-9.432 5.818,-14.484c1.439,-5.053 4.563,-21.743 3.828,-27.316c-0.735,-5.574 -0.551,-8.085 0.551,-10.596c1.103,-2.511 1.96,-4.349 2.603,-5.849c0.643,-1.47 0.735,-3.338 0.735,-3.338c0,0 -7.227,6.216 -12.066,9.095c-3.368,1.991 -7.165,4.257 -10.748,4.471c-6.738,0.367 -15.863,-9.463 -19.079,-14.424c-3.154,-4.838 -4.44,-7.747 -4.685,-9.125c-0.245,-1.378 0.306,-1.746 1.96,-0.307c1.653,1.44 6.768,7.84 9.86,10.933c3.093,3.093 8.299,9.126 13.781,6.798c5.451,-2.327 10.626,-8.084 13.444,-10.626c2.848,-2.511 7.349,-6.768 10.902,-8.605c3.552,-1.868 8.697,-3.767 8.697,-3.767c0,0 4.011,-3.123 10.503,-5.175c6.493,-2.021 14.179,-3.246 19.385,-2.603c5.206,0.612 14.699,2.174 18.497,3.032c3.828,0.888 20.211,3.766 26.519,3.307c6.309,-0.459 13.659,-2.328 17.456,-3.246c3.797,-0.919 7.625,-2.328 10.565,-2.603c12.464,-1.164 16.965,-7.87 23.917,-15.833c2.358,-2.694 12.678,-13.29 12.678,-13.29c0,0 -0.061,-0.245 0.03,-1.164c0.092,-0.949 0.827,-1.623 2.267,-2.848c1.439,-1.255 5.297,-3.583 8.176,-5.083c2.879,-1.501 8.177,-3.338 13.199,-3.246c5.022,0.092 6.492,0.551 10.167,1.745c3.675,1.195 5.481,2.021 7.656,3.553c2.143,1.531 3.338,3.338 3.521,4.44c0.215,1.102 0.796,1.072 1.531,1.623c0.735,0.521 3.369,1.531 6.033,2.144c2.695,0.612 4.869,0.826 6.768,1.653c1.899,0.827 4.747,1.501 5.91,1.96c1.164,0.46 1.531,1.072 1.623,2.021c0.092,0.98 -0.673,3.767 -2.45,5.696c-1.776,1.899 -2.541,2.695 -6.584,4.043c-2.358,0.765 -5.236,0.918 -8.023,0.673c-2.725,-0.245 -4.502,-0.643 -7.227,0.062c1.562,0.52 2.511,0.704 3.736,1.623c1.225,0.918 3.032,2.235 4.41,2.603c1.347,0.367 2.633,0.857 2.633,0.857c0,0 0.399,-0.122 0.735,-0.766c0.337,-0.643 0.582,-0.826 0.766,-0.122c0.153,0.704 -0.092,1.562 -0.092,1.562c0,0 0.245,0 1.194,0.918c0.95,0.95 0.95,1.899 0.644,2.052c-0.307,0.153 -0.46,1.96 -1.593,2.909c-0.306,0.276 -0.827,0.521 -1.439,0.705c-4.594,1.47 -7.472,-0.827 -11.76,-2.052c-1.378,-0.398 -6.155,-0.888 -8.176,-0.919c-3.491,-0.03 -4.961,-1.072 -7.197,-0.796c-4.593,0.613 -8.298,3.92 -10.166,12.341c-1.072,4.747 -7.718,16.751 -8.636,21.927c-0.919,5.175 -1.409,9.187 -1.072,11.912c0.857,6.829 -4.839,18.65 -8.238,24.04l-0.061,-0.062Z';

  const star = new Path(); // heavy-weight instance
  star.fill = 'red';
  // star.stroke = 'purple';
  // star.strokeWidth = 4;
  // star.lineJoin = 'round';
  star.svgPath = starPath;
  star.scalingX = 0.5;
  star.scalingY = 0.5;

  const rect = new Rect();
  rect.fill = 'red';
  rect.width = 50;
  rect.height = 50;

  const star2 = Object.create(star); // light-weight instance
  star2._setParent(undefined);
  star2.id = 'blah';
  star2.translationX = 100;
  star2.translationY = 100;
  star2.fill = 'yellow';

  const data = spirograph();
  const instances = data.map((datum, index) => {
    const instance = Shape.createInstance(star);
    // const instance = new Path(); // heavy-weight instance
    // instance.svgPath = starPath;
    // instance.scalingX = 0.5;
    // instance.scalingY = 0.5;
    // instance.stroke = 'purple';
    // instance.strokeWidth = 4;
    // instance.lineJoin = 'round';

    instance.translationX = datum.x + centerX;
    instance.translationY = datum.y + centerY;
    instance.fill = datum.color;

    return instance;
  });

  console.log(
    'prototype of the first instance:',
    Object.getPrototypeOf(instances[0]),
  );

  const n = instances.length;
  function step() {
    fpsCounter.countFrame();
    instances.push(instances.shift()!);
    data.forEach((datum, index) => {
      const instance = instances[index];
      instance.translationX = datum.x + centerX;
      instance.translationY = datum.y + centerY;
    });
    // for (let i = 0; i < n; i++) {
    //     const instance = instances[i];
    //     const datum = data[i];
    //     instance.translationX = datum.x + centerX;
    //     instance.translationY = datum.y + centerY;
    //     instance.fill = data[Math.floor(Math.random() * n)].color;
    // }
    requestAnimationFrame(step);
  }
  step();

  const tpl = new Rect();
  tpl.x = 100;
  tpl.y = 100;
  tpl.width = 100;
  tpl.height = 100;
  tpl.fill = 'red';
  tpl.stroke = 'black';
  tpl.strokeWidth = 4;

  const tplInstance = Shape.createInstance(tpl);
  tplInstance.width = 200;
  tplInstance.height = 40;
  tplInstance.fill = 'cyan';

  // const dog = new Path();
  // dog.fill = '#faeb00';
  // dog.stroke = 'black';
  // dog.strokeWidth = 1;
  // dog.scalingX = 4;
  // dog.scalingY = 4;
  // dog.svgPath = dogPath;
  // dog.translationX = 50;
  // dog.translationY = 50;
  // dog.lineJoin = 'round';

  // rootGroup.append([star]);
  rootGroup.append(instances);
  // rootGroup.appendChild(tplInstance);
  scene.root = rootGroup;

  setTimeout(() => {
    console.log(memorySizeOf(star));
    console.log(memorySizeOf(star2));
    // console.log('tpl', memorySizeOf(tpl));
    // console.log('tplInstance', memorySizeOf(tplInstance));
  }, 1000);

  // document.body.appendChild(document.createElement('br'));
  // createSlider('stroke width', [1, 2, 4, 6, 8, 10], v => {
  //     dog.strokeWidth = v;
  // });
  // createSlider('stroke opacity', [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0], v => {
  //     dog.strokeOpacity = v;
  // });
  // createSlider('fill opacity', [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0], v => {
  //     dog.fillOpacity = v;
  // });
});
