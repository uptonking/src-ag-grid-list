import { Path2D } from './path2D';

test('parseSvgPath', () => {
  const svgPath = '  M130 110 C 120 140,  180  140 170 110  z ';
  const parsedSvgPath = Path2D.parseSvgPath(svgPath);
  expect(parsedSvgPath).toEqual([
    {
      command: 'M',
      params: [130, 110],
    },
    {
      command: 'C',
      params: [120, 140, 180, 140, 170, 110],
    },
    {
      command: 'z',
      params: [],
    },
  ]);
});

test('prettifySvgPath', () => {
  const svgPath = '  M130 110 C 120 140,  180  140 170 110  z ';
  const prettySvgPath = Path2D.prettifySvgPath(svgPath);
  expect(prettySvgPath).toBe('M130,110\nC120,140,180,140,170,110\nz');
});

test('approximateCurve', () => {
  const path = new Path2D();
  path.approximateCurve([5, 45, -5, -40, 100, 25, 25, 20], 10);
  expect(path.toString()).toBe(
    'M5,45L5.155,23.78L10.440000000000001,10.240000000000002L19.085000000000004,3.0599999999999956L29.32,0.9199999999999997L39.375,2.5L47.48,6.479999999999999L51.865,11.54L50.760000000000005,16.359999999999996L42.39500000000001,19.620000000000005L25.00000000000002,20',
  );
});

test('fromString (basic)', () => {
  const svgPath = '  M130 110 C 120 140,  180  140 170 110  z ';
  const path = Path2D.fromString(svgPath);
  expect(path.commands).toEqual(['M', 'C', 'Z']);
  expect(path.params).toEqual([130, 110, 120, 140, 180, 140, 170, 110]);
});

test('fromString (real-life)', () => {
  // cog shape
  const pathString = `M5.005,16
A1.003,1.003,0,0,1,4,14.992
v-1.984
A0.998,0.998,0,0,1,5,12
h1.252
a7.87,7.87,0,0,1,0.853,-2.06
l-0.919,-0.925
c-0.356,-0.397,-0.348,-1,0.03,-1.379
l1.42,-1.42
a1,1,0,0,1,1.416,0.007
l0.889,0.882
A7.96,7.96,0,0,1,12,6.253
V5
c0,-0.514,0.46,-1,1,-1
h2
c0.557,0,1,0.44,1,1
v1.253
a7.96,7.96,0,0,1,2.06,0.852
l0.888,-0.882
a1,1,0,0,1,1.416,-0.006
l1.42,1.42
a0.999,0.999,0,0,1,0.029,1.377
s-0.4,0.406,-0.918,0.926
a7.87,7.87,0,0,1,0.853,2.06
H23
c0.557,0,1,0.447,1,1.008
v1.984
A0.998,0.998,0,0,1,23,16
h-1.252
a7.87,7.87,0,0,1,-0.853,2.06
l0.882,0.888
a1,1,0,0,1,0.006,1.416
l-1.42,1.42
a1,1,0,0,1,-1.415,-0.007
l-0.889,-0.882
a7.96,7.96,0,0,1,-2.059,0.852
v1.248
c0,0.56,-0.45,1.005,-1.008,1.005
h-1.984
A1.004,1.004,0,0,1,12,22.995
v-1.248
a7.96,7.96,0,0,1,-2.06,-0.852
l-0.888,0.882
a1,1,0,0,1,-1.416,0.006
l-1.42,-1.42
a1,1,0,0,1,0.007,-1.415
l0.882,-0.888
A7.87,7.87,0,0,1,6.252,16
H5.005
z
m3.378,-6.193
l-0.227,0.34
A6.884,6.884,0,0,0,7.14,12.6
l-0.082,0.4
H5.005
C5.002,13,5,13.664,5,14.992
c0,0.005,0.686,0.008,2.058,0.008
l0.082,0.4
c0.18,0.883,0.52,1.71,1.016,2.453
l0.227,0.34,-1.45,1.46
c-0.004,0.003,0.466,0.477,1.41,1.422
l1.464,-1.458,0.34,0.227
a6.959,6.959,0,0,0,2.454,1.016
l0.399,0.083
v2.052
c0,0.003,0.664,0.005,1.992,0.005,0.005,0,0.008,-0.686,0.008,-2.057
l0.399,-0.083
a6.959,6.959,0,0,0,2.454,-1.016
l0.34,-0.227,1.46,1.45
c0.003,0.004,0.477,-0.466,1.422,-1.41
l-1.458,-1.464,0.227,-0.34
A6.884,6.884,0,0,0,20.86,15.4
l0.082,-0.4
h2.053
c0.003,0,0.005,-0.664,0.005,-1.992,0,-0.005,-0.686,-0.008,-2.058,-0.008
l-0.082,-0.4
a6.884,6.884,0,0,0,-1.016,-2.453
l-0.227,-0.34,1.376,-1.384,0.081,-0.082,-1.416,-1.416,-1.465,1.458,-0.34,-0.227
a6.959,6.959,0,0,0,-2.454,-1.016
L15,7.057
V5
c0,-0.003,-0.664,-0.003,-1.992,0,-0.005,0,-0.008,0.686,-0.008,2.057
l-0.399,0.083
a6.959,6.959,0,0,0,-2.454,1.016
l-0.34,0.227,-1.46,-1.45
c-0.003,-0.004,-0.477,0.466,-1.421,1.408
l1.457,1.466
z`;

  const expectedPathString = `M5.005,16
L5.005,16
C4.451059510965188,16.001111458012808,4.001101004224841,15.552954980759639,3.999989546212034,14.999014491724827
C3.9999848547755685,14.996676322779138,3.999988339392861,14.994338144576028,3.9999999999999996,14.992
L4,13.008000000000001
L4,13.008000000000003
C3.994475989547463,12.456847501594725,4.436795273319196,12.005572027298257,4.987947771724473,12.00004801684572
C4.991965047883367,12.000007753079236,4.995982530547901,11.999991747172206,5,12.000000000000002
L6.252,12
L6.251999999999999,12
C6.437131107489881,11.276332116076468,6.724346087281575,10.582706256321613,7.104999999999999,9.939999999999998
L6.186,9.014999999999999
C5.83,8.617999999999999,5.838,8.014999999999999,6.216,7.635999999999999
L7.636,6.215999999999999
L7.635999999999999,6.215999999999999
C8.027953797618057,5.826910466051263,8.661114518953477,5.829232410529459,9.050204052902213,6.221186208147516
C9.050803473309262,6.221790041158721,9.051402122829403,6.222394638935272,9.051999999999998,6.222999999999999
L9.940999999999999,7.104999999999999
L9.940999999999997,7.105000000000001
C10.583990462916255,6.725863874216571,11.277113607920914,6.439054296973264,12,6.253000000000002
L12,5
C12,4.486,12.46,4,13,4
L15,4
C15.557,4,16,4.44,16,5
L16,6.253
L16.000000000000004,6.252999999999999
C16.723231961618694,6.438965780738181,17.416697428830602,6.725777711837476,18.060000000000002,7.105
L18.948,6.223000000000001
L18.947999999999997,6.223000000000001
C19.336366481904076,5.830329755864911,19.96952184840134,5.826840867235419,20.36219209253643,6.215207349139497
C20.36279548879591,6.215804132027912,20.363398125105395,6.216401682798921,20.363999999999997,6.2170000000000005
L21.784,7.6370000000000005
L21.784,7.6370000000000005
C22.159091747107233,8.014923562278593,22.171847870006605,8.620619466845373,21.813,9.014000000000001
C21.813,9.014000000000001,21.413,9.420000000000002,20.895,9.940000000000001
L20.894999999999996,9.940000000000005
C21.275653912718422,10.582706256321618,21.562868892510117,11.276332116076473,21.747999999999998,12.000000000000004
L23,12.000000000000002
C23.557,12.000000000000002,24,12.447000000000001,24,13.008000000000003
L24,14.992000000000003
L24,14.992000000000004
C24.005524010452532,15.54315249840528,23.5632047266808,15.994427972701747,23.01205222827552,15.999951983154281
C23.00803495211663,15.999992246920765,23.004017469452098,16.000008252827794,23,16
L21.748,16
L21.748000000000005,16.000000000000004
C21.56286889251012,16.723667883923532,21.275653912718425,17.417293743678385,20.895,18.060000000000002
L21.777,18.948
L21.777,18.947999999999997
C22.16967024413509,19.336366481904076,22.17315913276458,19.96952184840134,21.784792650860503,20.36219209253643
C21.784195867972088,20.36279548879591,21.78359831720108,20.363398125105395,21.783,20.363999999999997
L20.363,21.784
L20.363,21.784
C19.970769563628604,22.172810660449997,19.337610653912268,22.17003838431411,18.948799993462266,21.777807947942712
C18.94853317589022,21.777538783582365,18.948266511359705,21.77726946755794,18.948,21.776999999999997
L18.059,20.894999999999996
L18.058999999999997,20.894999999999996
C17.41600953708374,21.27413612578343,16.722886392079083,21.560945703026736,15.999999999999996,21.747
L16,22.994999999999997
C16,23.554999999999996,15.55,23.999999999999996,14.992,23.999999999999996
L13.008000000000001,23.999999999999996
L13.008000000000001,23.999999999999996
C12.453510512976047,24.00220941844334,12.00221688264029,23.55449796317721,12.00000746419695,23.000008476153255
C12.000000811975102,22.998338992904703,11.999998323901712,22.996669495660356,12,22.995
L12,21.747
L11.999999999999998,21.747
C11.276768038381306,21.561034219261817,10.583302571169398,21.27422228816252,9.939999999999998,20.894999999999996
L9.052,21.777
L9.052,21.777
C8.66363351809592,22.16967024413509,8.03047815159866,22.17315913276458,7.63780790746357,21.784792650860503
C7.637204511204088,21.784195867972088,7.636601874894602,21.78359831720108,7.635999999999998,21.783
L6.215999999999999,20.363
L6.215999999999999,20.363
C5.8271893395499985,19.970769563628604,5.829961615685885,19.337610653912268,6.222192052057283,18.94879999346227
C6.22246121641763,18.94853317589022,6.222730532442056,18.948266511359705,6.222999999999999,18.948
L7.104999999999999,18.06
L7.104999999999998,18.06
C6.724346087281575,17.417293743678385,6.43713110748988,16.723667883923532,6.251999999999999,16
L5.005,16
Z
M8.383,9.807
L8.155999999999999,10.147
L8.155999999999999,10.147000000000002
C7.66136551617927,10.890991124258402,7.316281622630355,11.724151351498055,7.14,12.600000000000001
L7.058,13
L5.005,13
C5.002,13,5,13.664,5,14.992
C5,14.997000000000002,5.686,15,7.058,15
L7.14,15.4
C7.319999999999999,16.283,7.66,17.11,8.155999999999999,17.853
L8.383,18.193
L6.932999999999999,19.653000000000002
C6.928999999999999,19.656000000000002,7.398999999999999,20.130000000000003,8.342999999999998,21.075000000000003
L9.806999999999999,19.617000000000004
L10.146999999999998,19.844000000000005
L10.146999999999998,19.844000000000005
C10.892185975599059,20.33707455678602,11.725358089465116,20.682022750627873,12.600999999999997,20.860000000000007
L13,20.943000000000005
L13,22.995000000000005
C13,22.998000000000005,13.664,23.000000000000004,14.992,23.000000000000004
C14.997000000000002,23.000000000000004,15,22.314000000000004,15,20.943000000000005
L15.399000000000001,20.860000000000007
L15.399000000000001,20.860000000000007
C16.274641910534882,20.682022750627876,17.10781402440094,20.33707455678602,17.853,19.84400000000001
L18.193,19.617000000000008
L19.653000000000002,21.067000000000007
C19.656000000000002,21.07100000000001,20.130000000000003,20.601000000000006,21.075000000000003,19.657000000000007
L19.617000000000004,18.19300000000001
L19.844000000000005,17.85300000000001
L19.84400000000001,17.85300000000001
C20.338634483820737,17.109008875741605,20.683718377369647,16.27584864850195,20.86,15.4
L20.942,15
L22.995,15
C22.998,15,23,14.336,23,13.008
C23,13.002999999999998,22.314,13,20.942,13
L20.86,12.6
L20.86,12.6
C20.683718377369644,11.724151351498053,20.33863448382073,10.890991124258399,19.844,10.147
L19.617,9.807
L20.993000000000002,8.423
L21.074,8.341
L19.658,6.924999999999999
L18.193,8.383
L17.853,8.155999999999999
L17.853,8.155999999999999
C17.10781402440094,7.662925443213984,16.274641910534882,7.317977249372129,15.399000000000001,7.139999999999999
L15,7.057
L15,5
C15,4.997,14.336,4.997,13.008,5
C13.002999999999998,5,13,5.686,13,7.057
L12.600999999999999,7.140000000000001
L12.600999999999999,7.140000000000001
C11.725358089465118,7.317977249372131,10.892185975599059,7.662925443213988,10.146999999999998,8.156000000000002
L9.806999999999999,8.383000000000001
L8.346999999999998,6.933000000000001
C8.343999999999998,6.929000000000001,7.869999999999997,7.399000000000001,6.9259999999999975,8.341000000000001
L8.382999999999997,9.807
Z`;

  const path = Path2D.fromString(pathString);
  expect(path.toPrettyString()).toBe(expectedPathString);
});
