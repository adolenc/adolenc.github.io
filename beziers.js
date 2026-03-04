window.requestAnimFrame=function() {return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(a) {window.setTimeout(a,1E3/60)}}();

document.addEventListener("DOMContentLoaded", function(event) {


var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = 500;
    const displayHeight = 500;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `22em`;
    canvas.style.height = `22em`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
setupCanvas();
window.addEventListener('resize', setupCanvas);

function clamp(num, min, max) {
  return Math.max(min, Math.min(num, max));
}

function getDirectionVector(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    return { x: dx / length, y: dy / length };
}

function sampleBezier(p, t) {
  var mt = 1 - t;
  return {
    x: mt*mt*mt*p[0].x + 3*mt*mt*t*p[1].x + 3*mt*t*t*p[2].x + t*t*t*p[3].x,
    y: mt*mt*mt*p[0].y + 3*mt*mt*t*p[1].y + 3*mt*t*t*p[2].y + t*t*t*p[3].y
  };
}

function distToStaticCurve(sc, mx, my) {
  var minDist = Infinity;
  for (var i = 0; i <= 12; i++) {
    var t = i / 12, mt = 1 - t;
    var x = mt*mt*mt*(sc.p[0].x+sc.repelPts[0].x) + 3*mt*mt*t*(sc.p[1].x+sc.repelPts[1].x) + 3*mt*t*t*(sc.p[2].x+sc.repelPts[2].x) + t*t*t*(sc.p[3].x+sc.repelPts[3].x);
    var y = mt*mt*mt*(sc.p[0].y+sc.repelPts[0].y) + 3*mt*mt*t*(sc.p[1].y+sc.repelPts[1].y) + 3*mt*t*t*(sc.p[2].y+sc.repelPts[2].y) + t*t*t*(sc.p[3].y+sc.repelPts[3].y);
    var dx = x - mx, dy = y - my;
    var d = Math.sqrt(dx*dx + dy*dy);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

var curves = [];
var staticCurves = [];

var mouseCanvasX = 250, mouseCanvasY = 250;
var prevMouseCanvasX = 250, prevMouseCanvasY = 250;
var smoothEyeX = 0, smoothEyeY = 0;
document.addEventListener('mousemove', function(e) {
    var rect = canvas.getBoundingClientRect();
    mouseCanvasX = (e.clientX - rect.left) / rect.width * 500;
    mouseCanvasY = (e.clientY - rect.top) / rect.height * 500;
});

function createStaticCurve(control_pts) {
  var bez = {
    alpha: 0,
    alpha_d: 0,
    hue: 0,
    repelPts: [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}],
    repelVel: [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}],
    lastRepelTime: 0,

    p: control_pts,

    draw: function(t) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'hsla('+this.hue+',100%,90%,'+this.alpha+')';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.p[0].x + this.repelPts[0].x, this.p[0].y + this.repelPts[0].y);
      ctx.bezierCurveTo(
        this.p[1].x + this.repelPts[1].x, this.p[1].y + this.repelPts[1].y,
        this.p[2].x + this.repelPts[2].x, this.p[2].y + this.repelPts[2].y,
        this.p[3].x + this.repelPts[3].x, this.p[3].y + this.repelPts[3].y
      );
      ctx.stroke();
    },  
    update: function(t) {
      if (t > 10) // leave the alpha at 100% for the first 10 seconds after loading page
        this.alpha = Math.max(0, this.alpha - this.alpha_d);
    }
  };
  curves.push(bez);
  staticCurves.push(bez);
  return bez;
}

function createFlyingCurve(i, static_curve) {
  var off = 0;
  curves.push({
    idx: i,
    hue: 0,
    speed: 2,
    alpha: 0,
    colorAngle: 20,

    flyby_started: false,
    static_curve_refreshed: false,
    flyby_start_t: 0,
    flyby_duration: 5.0,

    p: JSON.parse(JSON.stringify(static_curve.p)),
    initial_offsets: [],

    draw: function(t) {
      if (!this.flyby_started) return;

      ctx.lineWidth = 4;
      ctx.strokeStyle = 'hsla('+this.hue+',100%,65%,'+this.alpha+')';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.p[0].x, this.p[0].y);
      ctx.bezierCurveTo(this.p[1].x, this.p[1].y, this.p[2].x, this.p[2].y, this.p[3].x, this.p[3].y);
      ctx.stroke();
    },
    update: function(t) {
      if (!this.flyby_started) {
        if (!(static_curve.alpha < 0.3 && Math.pow(Math.max(0, t - 2.5)/1.0,3.0) > this.idx))
          return;
        else {
          this.hue = (0.5*Math.min(static_curve.p[0].y, static_curve.p[3].y) / 600
                    + 0.5*Math.min(static_curve.p[0].x, static_curve.p[3].x) / 600) * 360;
          if (static_curve.alpha == 0) // initial animation
            this.flyby_duration = 2;
          else
            this.flyby_duration = Math.random() * 6 + 1;

          this.static_curve_refreshed = false;
          this.flyby_started = true;
          this.flyby_start_t = t;

          this.initial_offsets = static_curve.p.map((point, i) => {
            const tangent = i === static_curve.p.length - 1
              ? getDirectionVector(static_curve.p[i - 1], static_curve.p[i])
              : getDirectionVector(static_curve.p[i], static_curve.p[i + 1]);

            return {
              x: 300 * tangent.x,
              y: 300 * tangent.y
            };
          });
        }
      }

      var interp_t = clamp(((t - this.flyby_start_t) - this.flyby_duration/2) / (this.flyby_duration/2), -1, 1.1);

      this.p = static_curve.p.map((point, i) => {
        return {
          x: point.x + this.initial_offsets[i].x * interp_t,
          y: point.y + this.initial_offsets[i].y * interp_t
        };
      });


      if (interp_t < 0)
        this.alpha = (1 + interp_t) * 0.8;
      else
        this.alpha = (1 - interp_t) * 0.3;

      if (!this.static_curve_refreshed && interp_t > 0) {
        static_curve.alpha = Math.random() * 5 + 2;
        static_curve.alpha_d = Math.random() * 0.002 + 0.0005;
        static_curve.hue = this.hue;
        static_curve.repelPts = [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}];
        static_curve.repelVel = [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}];
        static_curve.lastRepelTime = 0;
        this.static_curve_refreshed = true;
      }
      if (this.static_curve_refreshed && interp_t > 1)
        this.flyby_started = false;
    }
  });
}

let face = [
      // face shape
  [ {x: 122.574462890625, y: 196.53191757202148}, {x: 180.574462890625, y: 198.53191757202148}, {x: 261.574462890625, y: 180.53191757202148}, {x: 359.574462890625, y: 141.53191757202148} ],
  [ {x: 132.574462890625, y: 192.53191757202148}, {x: 155.574462890625, y: 246.53191757202148}, {x: 118.574462890625, y: 253.53191757202148}, {x: 116.574462890625, y: 272.5319175720215} ],
  [ {x: 116.574462890625, y: 272.5319175720215}, {x: 114.574462890625, y: 310.5319175720215}, {x: 134.574462890625, y: 338.5319175720215}, {x: 131.574462890625, y: 376.5319175720215} ],
  [ {x: 131.574462890625, y: 376.5319175720215}, {x: 129.574462890625, y: 417.5319175720215}, {x: 174.574462890625, y: 432.5319175720215}, {x: 203.574462890625, y: 445.5319175720215} ],
  [ {x: 359.574462890625, y: 145.53191757202148}, {x: 386.574462890625, y: 183.53191757202148}, {x: 362.574462890625, y: 209.53191757202148}, {x: 378.574462890625, y: 249.53191757202148} ],
  [ {x: 346.574462890625, y: 437.5319175720215}, {x: 372.574462890625, y: 409.5319175720215}, {x: 380.574462890625, y: 344.5319175720215}, {x: 384.574462890625, y: 291.5319175720215} ],
  [ {x: 220.574462890625, y: 409.5319175720215}, {x: 199.574462890625, y: 434.5319175720215}, {x: 201.574462890625, y: 462.5319175720215}, {x: 222.574462890625, y: 465.5319175720215} ],
  [ {x: 222.574462890625, y: 466.5319175720215}, {x: 271.574462890625, y: 496.5319175720215}, {x: 326.574462890625, y: 483.5319175720215}, {x: 345.574462890625, y: 438.5319175720215} ],
  [ {x: 333.574462890625, y: 406.5319175720215}, {x: 341.574462890625, y: 415.5319175720215}, {x: 346.574462890625, y: 431.5319175720215}, {x: 345.574462890625, y: 437.5319175720215} ],
  [ {x: 221.574462890625, y: 410.5319175720215}, {x: 248.574462890625, y: 451.5319175720215}, {x: 335.574462890625, y: 445.5319175720215}, {x: 333.574462890625, y: 406.5319175720215} ],
      // glasses
  [ {x: 134.0638427734375, y: 245.53191757202148}, {x: 149.0638427734375, y: 249.53191757202148}, {x: 164.0638427734375, y: 254.53191757202148}, {x: 176.0638427734375, y: 257.5319175720215} ],
  [ {x: 127.0638427734375, y: 255.53191757202148}, {x: 146.0638427734375, y: 259.5319175720215}, {x: 160.0638427734375, y: 264.5319175720215}, {x: 175.0638427734375, y: 270.5319175720215} ],
  [ {x: 177.0638427734375, y: 255.53191757202148}, {x: 204.0638427734375, y: 250.53191757202148}, {x: 239.0638427734375, y: 248.53191757202148}, {x: 273.0638427734375, y: 256.5319175720215} ],
  [ {x: 176.0638427734375, y: 255.53191757202148}, {x: 175.0638427734375, y: 283.5319175720215}, {x: 181.0638427734375, y: 296.5319175720215}, {x: 192.0638427734375, y: 292.5319175720215} ],
  [ {x: 192.0638427734375, y: 292.5319175720215}, {x: 217.0638427734375, y: 293.5319175720215}, {x: 272.0638427734375, y: 311.5319175720215}, {x: 272.0638427734375, y: 258.5319175720215} ],
  [ {x: 273.0638427734375, y: 255.53191757202148}, {x: 286.0638427734375, y: 256.5319175720215}, {x: 296.0638427734375, y: 255.53191757202148}, {x: 304.0638427734375, y: 254.53191757202148} ],
  [ {x: 273.0638427734375, y: 263.5319175720215}, {x: 282.0638427734375, y: 261.5319175720215}, {x: 292.0638427734375, y: 260.5319175720215}, {x: 302.0638427734375, y: 264.5319175720215} ],
  [ {x: 304.0638427734375, y: 254.53191757202148}, {x: 305.0638427734375, y: 272.5319175720215}, {x: 309.0638427734375, y: 302.5319175720215}, {x: 338.0638427734375, y: 294.5319175720215} ],
  [ {x: 338.0638427734375, y: 295.5319175720215}, {x: 368.0638427734375, y: 290.5319175720215}, {x: 394.0638427734375, y: 300.5319175720215}, {x: 392.0638427734375, y: 270.5319175720215} ],
  [ {x: 304.0638427734375, y: 255.53191757202148}, {x: 344.0638427734375, y: 250.53191757202148}, {x: 407.0638427734375, y: 235.53191757202148}, {x: 392.0638427734375, y: 270.5319175720215} ],
      // eyebrows
  [ {x: 177.574462890625, y: 236.53191757202148}, {x: 197.574462890625, y: 228.53191757202148}, {x: 236.574462890625, y: 226.53191757202148}, {x: 259.574462890625, y: 228.53191757202148} ],
  [ {x: 165.574462890625, y: 246.53191757202148}, {x: 167.574462890625, y: 244.53191757202148}, {x: 173.574462890625, y: 239.53191757202148}, {x: 178.574462890625, y: 236.53191757202148} ],
  [ {x: 165.574462890625, y: 247.53191757202148}, {x: 192.574462890625, y: 241.53191757202148}, {x: 229.574462890625, y: 234.53191757202148}, {x: 257.574462890625, y: 242.53191757202148} ],
  [ {x: 257.574462890625, y: 243.53191757202148}, {x: 258.574462890625, y: 238.53191757202148}, {x: 259.574462890625, y: 232.53191757202148}, {x: 260.574462890625, y: 228.53191757202148} ],
  [ {x: 318.574462890625, y: 229.53191757202148}, {x: 338.574462890625, y: 228.53191757202148}, {x: 354.574462890625, y: 228.53191757202148}, {x: 373.574462890625, y: 226.53191757202148} ],
  [ {x: 313.574462890625, y: 242.53191757202148}, {x: 314.574462890625, y: 236.53191757202148}, {x: 316.574462890625, y: 232.53191757202148}, {x: 318.574462890625, y: 229.53191757202148} ],
  [ {x: 313.574462890625, y: 242.53191757202148}, {x: 337.574462890625, y: 240.53191757202148}, {x: 357.574462890625, y: 238.53191757202148}, {x: 374.574462890625, y: 238.53191757202148} ],
      // nose
  [ {x: 308.574462890625, y: 295.5319175720215}, {x: 306.574462890625, y: 317.5319175720215}, {x: 324.574462890625, y: 319.5319175720215}, {x: 320.574462890625, y: 332.5319175720215} ],
  [ {x: 301.574462890625, y: 345.5319175720215}, {x: 310.574462890625, y: 340.5319175720215}, {x: 313.574462890625, y: 332.5319175720215}, {x: 321.574462890625, y: 332.5319175720215} ],
  [ {x: 267.574462890625, y: 334.5319175720215}, {x: 282.574462890625, y: 327.5319175720215}, {x: 293.574462890625, y: 336.5319175720215}, {x: 299.574462890625, y: 344.5319175720215} ],
      // mouth
  [ {x: 345.574462890625, y: 359.5319175720215}, {x: 352.574462890625, y: 368.5319175720215}, {x: 352.574462890625, y: 381.5319175720215}, {x: 346.574462890625, y: 389.5319175720215} ],
  [ {x: 224.574462890625, y: 395.5319175720215}, {x: 206.574462890625, y: 382.5319175720215}, {x: 208.574462890625, y: 357.5319175720215}, {x: 226.574462890625, y: 364.5319175720215} ],
  [ {x: 227.574462890625, y: 374.5319175720215}, {x: 252.574462890625, y: 385.5319175720215}, {x: 270.574462890625, y: 358.5319175720215}, {x: 288.574462890625, y: 377.5319175720215} ],
  [ {x: 288.574462890625, y: 377.5319175720215}, {x: 308.574462890625, y: 359.5319175720215}, {x: 314.574462890625, y: 384.5319175720215}, {x: 327.574462890625, y: 375.5319175720215} ],
  [ {x: 226.574462890625, y: 376.5319175720215}, {x: 256.574462890625, y: 383.5319175720215}, {x: 310.574462890625, y: 382.5319175720215}, {x: 327.574462890625, y: 375.5319175720215} ],
  [ {x: 227.574462890625, y: 378.5319175720215}, {x: 252.574462890625, y: 401.5319175720215}, {x: 313.574462890625, y: 396.5319175720215}, {x: 326.574462890625, y: 375.5319175720215} ],
  [ {x: 250.574462890625, y: 398.5319175720215}, {x: 273.574462890625, y: 402.5319175720215}, {x: 291.574462890625, y: 398.5319175720215}, {x: 308.574462890625, y: 395.5319175720215} ],
  [ {x: 250.574462890625, y: 398.5319175720215}, {x: 268.574462890625, y: 426.5319175720215}, {x: 299.574462890625, y: 416.5319175720215}, {x: 309.574462890625, y: 396.5319175720215} ],
      // ear
  [ {x: 125.574462890625, y: 337.5319175720215}, {x: 109.574462890625, y: 353.5319175720215}, {x: 91.574462890625, y: 338.5319175720215}, {x: 92.574462890625, y: 317.5319175720215} ],
  [ {x: 92.574462890625, y: 316.5319175720215}, {x: 92.574462890625, y: 297.5319175720215}, {x: 56.574462890625, y: 270.5319175720215}, {x: 79.574462890625, y: 251.53191757202148} ],
  [ {x: 81.574462890625, y: 251.53191757202148}, {x: 98.574462890625, y: 235.53191757202148}, {x: 104.574462890625, y: 269.5319175720215}, {x: 121.574462890625, y: 268.5319175720215} ],
  [ {x: 111.574462890625, y: 277.5319175720215}, {x: 77.574462890625, y: 289.5319175720215}, {x: 116.574462890625, y: 306.5319175720215}, {x: 108.574462890625, y: 320.5319175720215} ],
      // hair
  [ {x: 133.574462890625, y: 385.5319175720215}, {x: 116.574462890625, y: 386.5319175720215}, {x: 111.574462890625, y: 403.5319175720215}, {x: 102.574462890625, y: 424.5319175720215} ],
  [ {x: 106.574462890625, y: 362.5319175720215}, {x: 110.574462890625, y: 383.5319175720215}, {x: 108.574462890625, y: 399.5319175720215}, {x: 102.574462890625, y: 424.5319175720215} ],
  [ {x: 79.574462890625, y: 389.5319175720215}, {x: 88.574462890625, y: 391.5319175720215}, {x: 101.574462890625, y: 387.5319175720215}, {x: 107.574462890625, y: 362.5319175720215} ],
  [ {x: 65.574462890625, y: 299.5319175720215}, {x: 96.574462890625, y: 323.5319175720215}, {x: 109.574462890625, y: 373.5319175720215}, {x: 79.574462890625, y: 389.5319175720215} ],
  [ {x: 65.574462890625, y: 299.5319175720215}, {x: 47.574462890625, y: 258.5319175720215}, {x: 37.574462890625, y: 217.53191757202148}, {x: 49.574462890625, y: 191.53191757202148} ],
  [ {x: 22.574462890625, y: 197.53191757202148}, {x: 31.574462890625, y: 198.53191757202148}, {x: 41.574462890625, y: 195.53191757202148}, {x: 50.574462890625, y: 191.53191757202148} ],
  [ {x: 23.574462890625, y: 198.53191757202148}, {x: 37.574462890625, y: 189.53191757202148}, {x: 48.574462890625, y: 182.53191757202148}, {x: 64.574462890625, y: 174.53191757202148} ],
  [ {x: 25.574462890625, y: 172.53191757202148}, {x: 38.574462890625, y: 176.53191757202148}, {x: 47.574462890625, y: 176.53191757202148}, {x: 65.574462890625, y: 176.53191757202148} ],
  [ {x: 26.574462890625, y: 172.53191757202148}, {x: 94.574462890625, y: 173.53191757202148}, {x: 71.574462890625, y: 105.53191757202148}, {x: 134.574462890625, y: 58.531917572021484} ],
  [ {x: 134.574462890625, y: 59.531917572021484}, {x: 186.574462890625, y: 18.531917572021484}, {x: 245.574462890625, y: 18.531917572021484}, {x: 261.574462890625, y: 31.531917572021484} ],
  [ {x: 262.0638427734375, y: 32.531917572021484}, {x: 313.0638427734375, y: 10.531917572021484}, {x: 315.0638427734375, y: 74.53191757202148}, {x: 377.0638427734375, y: 59.531917572021484} ],
  [ {x: 337.0638427734375, y: 71.53191757202148}, {x: 352.0638427734375, y: 69.53191757202148}, {x: 365.0638427734375, y: 66.53191757202148}, {x: 377.0638427734375, y: 58.531917572021484} ],
  [ {x: 337.0638427734375, y: 72.53191757202148}, {x: 357.0638427734375, y: 72.53191757202148}, {x: 371.0638427734375, y: 74.53191757202148}, {x: 389.0638427734375, y: 70.53191757202148} ],
  [ {x: 342.0638427734375, y: 80.53191757202148}, {x: 363.0638427734375, y: 81.53191757202148}, {x: 375.0638427734375, y: 76.53191757202148}, {x: 390.0638427734375, y: 70.53191757202148} ],
  [ {x: 371.0638427734375, y: 76.53191757202148}, {x: 414.0638427734375, y: 106.53191757202148}, {x: 408.0638427734375, y: 151.53191757202148}, {x: 414.0638427734375, y: 178.53191757202148} ],
  [ {x: 384.0638427734375, y: 298.5319175720215}, {x: 411.0638427734375, y: 272.5319175720215}, {x: 424.0638427734375, y: 200.53191757202148}, {x: 414.0638427734375, y: 179.53191757202148} ],
      // eyelids
  [ {x: 188.574462890625, y: 259.5319175720215}, {x: 215.574462890625, y: 242.53191757202148}, {x: 237.574462890625, y: 253.53191757202148}, {x: 254.574462890625, y: 266.5319175720215} ],
  [ {x: 193.574462890625, y: 264.5319175720215}, {x: 227.574462890625, y: 238.53191757202148}, {x: 243.574462890625, y: 271.5319175720215}, {x: 254.574462890625, y: 266.5319175720215} ],
  [ {x: 196.574462890625, y: 270.5319175720215}, {x: 215.574462890625, y: 280.5319175720215}, {x: 237.574462890625, y: 276.5319175720215}, {x: 254.574462890625, y: 268.5319175720215} ],
  [ {x: 319.574462890625, y: 272.5319175720215}, {x: 337.574462890625, y: 277.5319175720215}, {x: 355.574462890625, y: 273.5319175720215}, {x: 356.574462890625, y: 260.5319175720215} ],
  [ {x: 323.574462890625, y: 253.53191757202148}, {x: 338.574462890625, y: 247.53191757202148}, {x: 352.574462890625, y: 254.53191757202148}, {x: 356.574462890625, y: 259.5319175720215} ],
      // eyes
  [ {x: 207.574462890625, y: 256.5319175720215}, {x: 205.574462890625, y: 266.5319175720215}, {x: 212.574462890625, y: 274.5319175720215}, {x: 219.574462890625, y: 271.5319175720215} ],
  [ {x: 219.574462890625, y: 271.5319175720215}, {x: 227.574462890625, y: 270.5319175720215}, {x: 232.574462890625, y: 263.5319175720215}, {x: 233.574462890625, y: 257.5319175720215} ],
  [ {x: 319.574462890625, y: 256.5319175720215}, {x: 318.574462890625, y: 266.5319175720215}, {x: 327.574462890625, y: 272.5319175720215}, {x: 335.574462890625, y: 269.5319175720215} ],
  [ {x: 335.574462890625, y: 268.5319175720215}, {x: 342.574462890625, y: 269.5319175720215}, {x: 346.574462890625, y: 259.5319175720215}, {x: 341.574462890625, y: 255.53191757202148} ],
];
var eyeStaticCurves = [];
var eyeOriginalPoints = [];
var EYE_START = face.length - 4; // last 4 curves are the eyes
var flyInOrder = Array.from({length: face.length}, (_, i) => i);
for (let i = flyInOrder.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [flyInOrder[i], flyInOrder[j]] = [flyInOrder[j], flyInOrder[i]];
}
for (let i = 0; i < face.length; i++) {
  var sc = createStaticCurve(face[i]);
  createFlyingCurve(flyInOrder[i], sc);
  if (i >= EYE_START) {
    eyeStaticCurves.push(sc);
    eyeOriginalPoints.push(sc.p.map(pt => ({x: pt.x, y: pt.y})));
  }
}

function loop(ts) {
  window.requestAnimationFrame(loop);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Subtle eye-following: offset eye curves toward cursor
  var eyeCenterX = 275, eyeCenterY = 265;
  var dx = mouseCanvasX - eyeCenterX;
  var dy = mouseCanvasY - eyeCenterY;
  var dist = Math.sqrt(dx * dx + dy * dy) || 1;
  var maxOffset = 3;
  var factor = Math.min(dist / 100, 1) * maxOffset;
  var targetX = (dx / dist) * factor;
  var targetY = (dy / dist) * factor;
  smoothEyeX += (targetX - smoothEyeX) * 0.08;
  smoothEyeY += (targetY - smoothEyeY) * 0.08;
  for (var ei = 0; ei < eyeStaticCurves.length; ei++) {
    for (var pi = 0; pi < eyeStaticCurves[ei].p.length; pi++) {
      eyeStaticCurves[ei].p[pi].x = eyeOriginalPoints[ei][pi].x + smoothEyeX;
      eyeStaticCurves[ei].p[pi].y = eyeOriginalPoints[ei][pi].y + smoothEyeY;
    }
  }

  let ms = ts / 1000;

  // Mouse repulsion: velocity-based physics — mouse imparts impulse, control points fly away
  var mouseMoved = Math.abs(mouseCanvasX - prevMouseCanvasX) + Math.abs(mouseCanvasY - prevMouseCanvasY) > 0.5;
  prevMouseCanvasX = mouseCanvasX;
  prevMouseCanvasY = mouseCanvasY;

  var REPEL_DIST = 60;
  var CTRL_REPEL_RADIUS = 120;
  var DECAY_DELAY = 0.5;
  for (var si = 0; si < staticCurves.length; si++) {
    var sc = staticCurves[si];

    // Integrate velocity into position, then apply friction
    for (var pi = 0; pi < 4; pi++) {
      sc.repelPts[pi].x += sc.repelVel[pi].x;
      sc.repelPts[pi].y += sc.repelVel[pi].y;
      sc.repelVel[pi].x *= 0.93;
      sc.repelVel[pi].y *= 0.93;
    }

    // Check proximity (pauses decay timer while mouse is nearby)
    var withinRange = ms > 10 && sc.alpha > 0.05 &&
                      distToStaticCurve(sc, mouseCanvasX, mouseCanvasY) < REPEL_DIST;
    if (withinRange) sc.lastRepelTime = ms;

    // Delayed position decay — very slow drift back after mouse leaves
    if (ms - sc.lastRepelTime > DECAY_DELAY) {
      for (var pi = 0; pi < 4; pi++) {
        sc.repelPts[pi].x *= 0.99;
        sc.repelPts[pi].y *= 0.99;
      }
    }

    // Impart impulse when mouse is moving near the curve
    if (withinRange && mouseMoved) {
      for (var pi = 0; pi < 4; pi++) {
        var cx = sc.p[pi].x + sc.repelPts[pi].x;
        var cy = sc.p[pi].y + sc.repelPts[pi].y;
        var pdx = cx - mouseCanvasX, pdy = cy - mouseCanvasY;
        var pd = Math.sqrt(pdx*pdx + pdy*pdy) || 1;
        if (pd < CTRL_REPEL_RADIUS) {
          var impulse = (1 - pd / CTRL_REPEL_RADIUS) * 3.5;
          sc.repelVel[pi].x += (pdx / pd) * impulse;
          sc.repelVel[pi].y += (pdy / pd) * impulse;
        }
      }
      sc.alpha = Math.min(sc.alpha, 0.6);
      if (sc.alpha_d < 0.02) sc.alpha_d = 0.02;
    }
  }

  for (let i = curves.length - 1; i >= 0; i--) {
    curves[i].update(ms);
    curves[i].draw(ms);
  }
}
loop();


});
