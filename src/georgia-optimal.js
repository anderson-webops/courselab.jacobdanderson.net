/* Saved best-found design. gx/gy use west/north half-wavelength indices; phases use radians. */
(() => {
  'use strict';
  const root=typeof window==='undefined'?globalThis:window;
  const data={
  "label": "Optimal",
  "description": "Saved best-found 175-element design",
  "settings": {
    "aperture": "explicit",
    "longitude": -83.56,
    "normal": "nadir",
    "tiltX": 0,
    "tiltY": 0,
    "roll": 0,
    "autoSteer": false,
    "steeringLat": 32.7,
    "steeringLon": -83.6,
    "phaseX": 0,
    "phaseY": 0,
    "powerDBW": 83.36533541251143,
    "frequencyGHz": 30.0,
    "stride": 1
  },
  "steeringReference": {
    "u": 0.00010113943993300761,
    "v": 0.09300590654889954
  },
  "feeds": [
    {
      "id": "feed0",
      "gx": 130,
      "gy": 4,
      "phaseRad": -0.020311042371448457
    },
    {
      "id": "feed1",
      "gx": -176,
      "gy": -22,
      "phaseRad": 12.74140825102819
    },
    {
      "id": "feed2",
      "gx": 68,
      "gy": -3,
      "phaseRad": 0.6623341086244044
    },
    {
      "id": "feed3",
      "gx": -174,
      "gy": 36,
      "phaseRad": -10.041904161102757
    },
    {
      "id": "feed4",
      "gx": 22,
      "gy": -115,
      "phaseRad": 31.729090773264065
    },
    {
      "id": "feed5",
      "gx": 1,
      "gy": 138,
      "phaseRad": -39.17380265032901
    },
    {
      "id": "feed6",
      "gx": 154,
      "gy": -68,
      "phaseRad": 20.2663611624298
    },
    {
      "id": "feed7",
      "gx": -29,
      "gy": -131,
      "phaseRad": 35.228570220707816
    },
    {
      "id": "feed8",
      "gx": -111,
      "gy": 88,
      "phaseRad": -29.009655268344645
    },
    {
      "id": "feed9",
      "gx": -30,
      "gy": -3,
      "phaseRad": 0.7555710022514246
    },
    {
      "id": "feed10",
      "gx": 52,
      "gy": -174,
      "phaseRad": 50.04633387015412
    },
    {
      "id": "feed11",
      "gx": -133,
      "gy": 1,
      "phaseRad": -1.4100713938788756
    },
    {
      "id": "feed12",
      "gx": 8,
      "gy": -121,
      "phaseRad": 37.17379492175078
    },
    {
      "id": "feed13",
      "gx": -94,
      "gy": 153,
      "phaseRad": -46.68908203520584
    },
    {
      "id": "feed14",
      "gx": 79,
      "gy": 72,
      "phaseRad": -19.513317488095815
    },
    {
      "id": "feed15",
      "gx": -42,
      "gy": 134,
      "phaseRad": -41.17012040682668
    },
    {
      "id": "feed16",
      "gx": 45,
      "gy": 56,
      "phaseRad": -15.619729413991738
    },
    {
      "id": "feed17",
      "gx": 75,
      "gy": -102,
      "phaseRad": 29.502935583115885
    },
    {
      "id": "feed18",
      "gx": -6,
      "gy": 95,
      "phaseRad": -29.493337608171963
    },
    {
      "id": "feed19",
      "gx": -91,
      "gy": -18,
      "phaseRad": 4.8697547117038855
    },
    {
      "id": "feed20",
      "gx": 148,
      "gy": -61,
      "phaseRad": 18.43372126192344
    },
    {
      "id": "feed21",
      "gx": 66,
      "gy": -81,
      "phaseRad": 23.45639235365981
    },
    {
      "id": "feed22",
      "gx": 125,
      "gy": -21,
      "phaseRad": 7.5877704479089765
    },
    {
      "id": "feed23",
      "gx": -125,
      "gy": -151,
      "phaseRad": 44.8074116301247
    },
    {
      "id": "feed24",
      "gx": -30,
      "gy": -205,
      "phaseRad": 66.07616740527939
    },
    {
      "id": "feed25",
      "gx": 142,
      "gy": 69,
      "phaseRad": -21.38442885155853
    },
    {
      "id": "feed26",
      "gx": 101,
      "gy": -101,
      "phaseRad": 28.11168603594681
    },
    {
      "id": "feed27",
      "gx": -25,
      "gy": 107,
      "phaseRad": -31.08640229418048
    },
    {
      "id": "feed28",
      "gx": 57,
      "gy": 52,
      "phaseRad": -13.679888273445915
    },
    {
      "id": "feed29",
      "gx": -115,
      "gy": 160,
      "phaseRad": -37.803457260278165
    },
    {
      "id": "feed30",
      "gx": 15,
      "gy": 151,
      "phaseRad": -42.249675577083664
    },
    {
      "id": "feed31",
      "gx": 49,
      "gy": 43,
      "phaseRad": -11.21227820000646
    },
    {
      "id": "feed32",
      "gx": 33,
      "gy": -163,
      "phaseRad": 45.69128710126751
    },
    {
      "id": "feed33",
      "gx": -33,
      "gy": 183,
      "phaseRad": -54.11778269361771
    },
    {
      "id": "feed34",
      "gx": 1,
      "gy": -166,
      "phaseRad": 48.32167733791952
    },
    {
      "id": "feed35",
      "gx": -154,
      "gy": -93,
      "phaseRad": 29.450349473923545
    },
    {
      "id": "feed36",
      "gx": -35,
      "gy": 10,
      "phaseRad": -2.7375885754615363
    },
    {
      "id": "feed37",
      "gx": 127,
      "gy": 39,
      "phaseRad": -10.269802920281126
    },
    {
      "id": "feed38",
      "gx": -18,
      "gy": 142,
      "phaseRad": -40.28122640123608
    },
    {
      "id": "feed39",
      "gx": 44,
      "gy": 9,
      "phaseRad": -3.271514013742777
    },
    {
      "id": "feed40",
      "gx": 111,
      "gy": 109,
      "phaseRad": -32.523300391304794
    },
    {
      "id": "feed41",
      "gx": -163,
      "gy": -41,
      "phaseRad": 12.28182703192389
    },
    {
      "id": "feed42",
      "gx": -54,
      "gy": -151,
      "phaseRad": 45.33815423658295
    },
    {
      "id": "feed43",
      "gx": 42,
      "gy": 96,
      "phaseRad": -27.871279045176898
    },
    {
      "id": "feed44",
      "gx": 150,
      "gy": 84,
      "phaseRad": -22.625398014675433
    },
    {
      "id": "feed45",
      "gx": -70,
      "gy": -127,
      "phaseRad": 36.67121836564784
    },
    {
      "id": "feed46",
      "gx": -123,
      "gy": 45,
      "phaseRad": -15.338162334208182
    },
    {
      "id": "feed47",
      "gx": -89,
      "gy": -152,
      "phaseRad": 45.27550957478895
    },
    {
      "id": "feed48",
      "gx": 70,
      "gy": 5,
      "phaseRad": -1.0297917354160302
    },
    {
      "id": "feed49",
      "gx": -101,
      "gy": -151,
      "phaseRad": 44.75390850996608
    },
    {
      "id": "feed50",
      "gx": 31,
      "gy": 172,
      "phaseRad": -49.0682333451791
    },
    {
      "id": "feed51",
      "gx": 27,
      "gy": -186,
      "phaseRad": 54.88982811818432
    },
    {
      "id": "feed52",
      "gx": -53,
      "gy": -69,
      "phaseRad": 20.421027364916252
    },
    {
      "id": "feed53",
      "gx": -155,
      "gy": -54,
      "phaseRad": 16.490411614977106
    },
    {
      "id": "feed54",
      "gx": -36,
      "gy": -83,
      "phaseRad": 24.39021436782405
    },
    {
      "id": "feed55",
      "gx": -19,
      "gy": -57,
      "phaseRad": 16.272178968127346
    },
    {
      "id": "feed56",
      "gx": 163,
      "gy": 45,
      "phaseRad": -17.52893987865236
    },
    {
      "id": "feed57",
      "gx": 160,
      "gy": -59,
      "phaseRad": 22.33578187987372
    },
    {
      "id": "feed58",
      "gx": -164,
      "gy": 53,
      "phaseRad": -13.98412071857937
    },
    {
      "id": "feed59",
      "gx": -119,
      "gy": 41,
      "phaseRad": -12.993992371805188
    },
    {
      "id": "feed60",
      "gx": -27,
      "gy": 106,
      "phaseRad": -29.99582546419535
    },
    {
      "id": "feed61",
      "gx": 7,
      "gy": 16,
      "phaseRad": -4.8157604999471575
    },
    {
      "id": "feed62",
      "gx": -82,
      "gy": 141,
      "phaseRad": -38.874630761528486
    },
    {
      "id": "feed63",
      "gx": -143,
      "gy": 68,
      "phaseRad": -17.876776887951124
    },
    {
      "id": "feed64",
      "gx": -164,
      "gy": -27,
      "phaseRad": 7.6394900787205735
    },
    {
      "id": "feed65",
      "gx": -71,
      "gy": -76,
      "phaseRad": 21.973013339281113
    },
    {
      "id": "feed66",
      "gx": 54,
      "gy": -76,
      "phaseRad": 22.97717945225061
    },
    {
      "id": "feed67",
      "gx": -120,
      "gy": -94,
      "phaseRad": 29.18776217776458
    },
    {
      "id": "feed68",
      "gx": 132,
      "gy": 111,
      "phaseRad": -29.803712311910108
    },
    {
      "id": "feed69",
      "gx": 11,
      "gy": -208,
      "phaseRad": 60.458607300410506
    },
    {
      "id": "feed70",
      "gx": 6,
      "gy": -82,
      "phaseRad": 24.02577232149779
    },
    {
      "id": "feed71",
      "gx": 30,
      "gy": -143,
      "phaseRad": 43.974678844217664
    },
    {
      "id": "feed72",
      "gx": -140,
      "gy": -116,
      "phaseRad": 36.05540503742256
    },
    {
      "id": "feed73",
      "gx": 7,
      "gy": 138,
      "phaseRad": -40.030185058684296
    },
    {
      "id": "feed74",
      "gx": 81,
      "gy": 133,
      "phaseRad": -34.62257865448823
    },
    {
      "id": "feed75",
      "gx": 22,
      "gy": 21,
      "phaseRad": -6.485154013992208
    },
    {
      "id": "feed76",
      "gx": -145,
      "gy": -37,
      "phaseRad": 10.718632509721784
    },
    {
      "id": "feed77",
      "gx": 157,
      "gy": -87,
      "phaseRad": 30.857074727885042
    },
    {
      "id": "feed78",
      "gx": 65,
      "gy": 178,
      "phaseRad": -49.558857194689296
    },
    {
      "id": "feed79",
      "gx": -94,
      "gy": -166,
      "phaseRad": 50.41413521490057
    },
    {
      "id": "feed80",
      "gx": 111,
      "gy": -114,
      "phaseRad": 31.780090490333166
    },
    {
      "id": "feed81",
      "gx": -89,
      "gy": -13,
      "phaseRad": 2.5940770857538973
    },
    {
      "id": "feed82",
      "gx": -138,
      "gy": -92,
      "phaseRad": 29.487408437546964
    },
    {
      "id": "feed83",
      "gx": -17,
      "gy": -95,
      "phaseRad": 27.19466870501963
    },
    {
      "id": "feed84",
      "gx": 142,
      "gy": -99,
      "phaseRad": 26.241865298638366
    },
    {
      "id": "feed85",
      "gx": 44,
      "gy": -12,
      "phaseRad": 2.8877673837944453
    },
    {
      "id": "feed86",
      "gx": -123,
      "gy": 128,
      "phaseRad": -32.938213959545266
    },
    {
      "id": "feed87",
      "gx": 30,
      "gy": -78,
      "phaseRad": 23.00566083940259
    },
    {
      "id": "feed88",
      "gx": -110,
      "gy": -17,
      "phaseRad": 3.6243885783904584
    },
    {
      "id": "feed89",
      "gx": -47,
      "gy": 106,
      "phaseRad": -32.523464796012505
    },
    {
      "id": "feed90",
      "gx": -139,
      "gy": -67,
      "phaseRad": 21.58947811466916
    },
    {
      "id": "feed91",
      "gx": -64,
      "gy": -49,
      "phaseRad": 14.639206108666771
    },
    {
      "id": "feed92",
      "gx": -111,
      "gy": 30,
      "phaseRad": -10.560081822630163
    },
    {
      "id": "feed93",
      "gx": 0,
      "gy": 16,
      "phaseRad": -4.583535818137181
    },
    {
      "id": "feed94",
      "gx": 49,
      "gy": -93,
      "phaseRad": 27.68765843795481
    },
    {
      "id": "feed95",
      "gx": -79,
      "gy": -102,
      "phaseRad": 27.645228094358462
    },
    {
      "id": "feed96",
      "gx": 45,
      "gy": -45,
      "phaseRad": 12.808762075270765
    },
    {
      "id": "feed97",
      "gx": 77,
      "gy": -143,
      "phaseRad": 39.19021084873517
    },
    {
      "id": "feed98",
      "gx": -79,
      "gy": 93,
      "phaseRad": -30.29731124629882
    },
    {
      "id": "feed99",
      "gx": 134,
      "gy": -89,
      "phaseRad": 23.07547707509361
    },
    {
      "id": "feed100",
      "gx": -127,
      "gy": -84,
      "phaseRad": 26.478359009417257
    },
    {
      "id": "feed101",
      "gx": -107,
      "gy": 62,
      "phaseRad": -21.06791583210182
    },
    {
      "id": "feed102",
      "gx": 121,
      "gy": 137,
      "phaseRad": -36.43868813794109
    },
    {
      "id": "feed103",
      "gx": -107,
      "gy": -113,
      "phaseRad": 34.11287983569109
    },
    {
      "id": "feed104",
      "gx": -124,
      "gy": -124,
      "phaseRad": 38.81223074716408
    },
    {
      "id": "feed105",
      "gx": 103,
      "gy": -26,
      "phaseRad": 8.21585340371055
    },
    {
      "id": "feed106",
      "gx": -112,
      "gy": -86,
      "phaseRad": 27.188988286292076
    },
    {
      "id": "feed107",
      "gx": 54,
      "gy": 69,
      "phaseRad": -23.11817734977454
    },
    {
      "id": "feed108",
      "gx": 135,
      "gy": 142,
      "phaseRad": -38.20832307349557
    },
    {
      "id": "feed109",
      "gx": -87,
      "gy": -21,
      "phaseRad": 6.464509568799884
    },
    {
      "id": "feed110",
      "gx": -32,
      "gy": 100,
      "phaseRad": -30.060864267635164
    },
    {
      "id": "feed111",
      "gx": -11,
      "gy": 56,
      "phaseRad": -15.730726788811182
    },
    {
      "id": "feed112",
      "gx": -79,
      "gy": 55,
      "phaseRad": -16.771581222469326
    },
    {
      "id": "feed113",
      "gx": 76,
      "gy": 163,
      "phaseRad": -43.83979947826399
    },
    {
      "id": "feed114",
      "gx": 54,
      "gy": 166,
      "phaseRad": -45.44629831126634
    },
    {
      "id": "feed115",
      "gx": -34,
      "gy": -65,
      "phaseRad": 18.700479846365123
    },
    {
      "id": "feed116",
      "gx": -110,
      "gy": -20,
      "phaseRad": 8.449844954900449
    },
    {
      "id": "feed117",
      "gx": -108,
      "gy": -55,
      "phaseRad": 12.395261677651757
    },
    {
      "id": "feed118",
      "gx": -144,
      "gy": 38,
      "phaseRad": -4.723609536146858
    },
    {
      "id": "feed119",
      "gx": 74,
      "gy": 114,
      "phaseRad": -31.07174324930365
    },
    {
      "id": "feed120",
      "gx": -131,
      "gy": 53,
      "phaseRad": -15.766233506766053
    },
    {
      "id": "feed121",
      "gx": 97,
      "gy": -158,
      "phaseRad": 45.05258934291896
    },
    {
      "id": "feed122",
      "gx": -5,
      "gy": 181,
      "phaseRad": -51.906713381862936
    },
    {
      "id": "feed123",
      "gx": -100,
      "gy": -51,
      "phaseRad": 12.832863383869517
    },
    {
      "id": "feed124",
      "gx": -61,
      "gy": -123,
      "phaseRad": 36.21403007711781
    },
    {
      "id": "feed125",
      "gx": 19,
      "gy": -127,
      "phaseRad": 38.14469347617965
    },
    {
      "id": "feed126",
      "gx": 57,
      "gy": 22,
      "phaseRad": -6.06263174506317
    },
    {
      "id": "feed127",
      "gx": 76,
      "gy": 34,
      "phaseRad": -10.963865454790223
    },
    {
      "id": "feed128",
      "gx": 96,
      "gy": -1,
      "phaseRad": -3.685466853106492
    },
    {
      "id": "feed129",
      "gx": 90,
      "gy": -55,
      "phaseRad": 16.93138723170097
    },
    {
      "id": "feed130",
      "gx": 90,
      "gy": 54,
      "phaseRad": -16.52990258427136
    },
    {
      "id": "feed131",
      "gx": -135,
      "gy": 33,
      "phaseRad": -10.593827610405175
    },
    {
      "id": "feed132",
      "gx": 172,
      "gy": -54,
      "phaseRad": 21.008294432225256
    },
    {
      "id": "feed133",
      "gx": -84,
      "gy": 159,
      "phaseRad": -40.03050469297085
    },
    {
      "id": "feed134",
      "gx": -151,
      "gy": -65,
      "phaseRad": 21.823153103266243
    },
    {
      "id": "feed135",
      "gx": 119,
      "gy": -122,
      "phaseRad": 32.821957297056265
    },
    {
      "id": "feed136",
      "gx": 130,
      "gy": 61,
      "phaseRad": -16.45294920543187
    },
    {
      "id": "feed137",
      "gx": 126,
      "gy": 140,
      "phaseRad": -37.5334399571307
    },
    {
      "id": "feed138",
      "gx": 0,
      "gy": -176,
      "phaseRad": 55.08972756633777
    },
    {
      "id": "feed139",
      "gx": 103,
      "gy": -89,
      "phaseRad": 22.912000994307434
    },
    {
      "id": "feed140",
      "gx": -47,
      "gy": 19,
      "phaseRad": -5.683889448827999
    },
    {
      "id": "feed141",
      "gx": 75,
      "gy": 119,
      "phaseRad": -33.37863951618768
    },
    {
      "id": "feed142",
      "gx": 72,
      "gy": 49,
      "phaseRad": -11.948279389541671
    },
    {
      "id": "feed143",
      "gx": -60,
      "gy": -31,
      "phaseRad": 8.83280973520158
    },
    {
      "id": "feed144",
      "gx": -122,
      "gy": -49,
      "phaseRad": 12.331993379937787
    },
    {
      "id": "feed145",
      "gx": -39,
      "gy": -182,
      "phaseRad": 53.59335638891893
    },
    {
      "id": "feed146",
      "gx": -64,
      "gy": -88,
      "phaseRad": 25.009110222826685
    },
    {
      "id": "feed147",
      "gx": -158,
      "gy": 19,
      "phaseRad": 0.2549257028182561
    },
    {
      "id": "feed148",
      "gx": -131,
      "gy": -3,
      "phaseRad": 1.7579782872893723
    },
    {
      "id": "feed149",
      "gx": 47,
      "gy": -61,
      "phaseRad": 17.498012949991896
    },
    {
      "id": "feed150",
      "gx": -166,
      "gy": -75,
      "phaseRad": 21.497082219347572
    },
    {
      "id": "feed151",
      "gx": 73,
      "gy": 104,
      "phaseRad": -28.622292388989926
    },
    {
      "id": "feed152",
      "gx": -94,
      "gy": -33,
      "phaseRad": 9.801922958572634
    },
    {
      "id": "feed153",
      "gx": -152,
      "gy": -82,
      "phaseRad": 26.012266602212023
    },
    {
      "id": "feed154",
      "gx": -56,
      "gy": -36,
      "phaseRad": 10.781240535275934
    },
    {
      "id": "feed155",
      "gx": 21,
      "gy": -180,
      "phaseRad": 52.75649117484802
    },
    {
      "id": "feed156",
      "gx": 70,
      "gy": 42,
      "phaseRad": -10.588657197939703
    },
    {
      "id": "feed157",
      "gx": -39,
      "gy": 125,
      "phaseRad": -33.86509998629666
    },
    {
      "id": "feed158",
      "gx": 9,
      "gy": -101,
      "phaseRad": 30.231941513699248
    },
    {
      "id": "feed159",
      "gx": 34,
      "gy": -190,
      "phaseRad": 60.482006635855164
    },
    {
      "id": "feed160",
      "gx": -51,
      "gy": 118,
      "phaseRad": -33.93573949261541
    },
    {
      "id": "feed161",
      "gx": 4,
      "gy": 209,
      "phaseRad": -58.64964731184311
    },
    {
      "id": "feed162",
      "gx": -100,
      "gy": -120,
      "phaseRad": 35.59860397247784
    },
    {
      "id": "feed163",
      "gx": -52,
      "gy": 166,
      "phaseRad": -48.51929514301771
    },
    {
      "id": "feed164",
      "gx": -64,
      "gy": 133,
      "phaseRad": -40.20367791598295
    },
    {
      "id": "feed165",
      "gx": -44,
      "gy": -106,
      "phaseRad": 31.65776780503573
    },
    {
      "id": "feed166",
      "gx": 79,
      "gy": 96,
      "phaseRad": -29.527832588493933
    },
    {
      "id": "feed167",
      "gx": -58,
      "gy": -194,
      "phaseRad": 63.25294158115224
    },
    {
      "id": "feed168",
      "gx": -4,
      "gy": -95,
      "phaseRad": 28.878983714305917
    },
    {
      "id": "feed169",
      "gx": 180,
      "gy": -8,
      "phaseRad": 6.21317288577209
    },
    {
      "id": "feed170",
      "gx": 156,
      "gy": 26,
      "phaseRad": -6.199179330546548
    },
    {
      "id": "feed171",
      "gx": 108,
      "gy": -17,
      "phaseRad": 5.787453401719921
    },
    {
      "id": "feed172",
      "gx": 140,
      "gy": 44,
      "phaseRad": -11.743186694528783
    },
    {
      "id": "feed173",
      "gx": -26,
      "gy": -127,
      "phaseRad": 38.791223196412965
    },
    {
      "id": "feed174",
      "gx": -20,
      "gy": 129,
      "phaseRad": -35.985930894161555
    }
  ]
};
  for(const feed of data.feeds)Object.freeze(feed);
  Object.freeze(data.feeds);Object.freeze(data.settings);Object.freeze(data.steeringReference);
  root.GeorgiaOptimalPreset=Object.freeze(data);
})();
