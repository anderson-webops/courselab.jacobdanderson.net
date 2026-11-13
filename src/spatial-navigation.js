/* Spatial companions use the existing navigation models and preserve their readouts. */
(() => {
  'use strict';
  const rad = degrees => degrees * Math.PI / 180;
  const range = (steps, fn) => Array.from({length: steps + 1}, (_, i) => fn(i / steps));
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const moduleFor = id => modules.find(module => module.id === id);
  const componentLabel = (scene, a, b, text, color, offset = 18) => {
    const p = scene.project(a), q = scene.project(b), dx = q[0] - p[0], dy = q[1] - p[1];
    const length = Math.hypot(dx, dy);
    if (length < 18) return '';
    let nx = -dy / length, ny = dx / length;
    if (ny < 0) {nx = -nx; ny = -ny;}
    return scene.label(a.map((value, i) => (value + b[i]) / 2), text, color, nx * offset, ny * offset + 5);
  };
  const extendChecks = (module, checks) => {
    const previous = module.checks;
    module.checks = () => [...(previous ? previous() : []), ...checks()];
  };

  const framePosition = v => {
    const latitude = rad(v.latitude), longitude = rad(v.longitude), rotation = rad(v.rotation);
    const radius = 6378 + v.altitude;
    const fixed = [radius * Math.cos(latitude) * Math.cos(longitude),
      radius * Math.cos(latitude) * Math.sin(longitude), radius * Math.sin(latitude)];
    const inertial = [fixed[0] * Math.cos(rotation) - fixed[1] * Math.sin(rotation),
      fixed[0] * Math.sin(rotation) + fixed[1] * Math.cos(rotation), fixed[2]];
    return {fixed, inertial, radius, latitude, longitude, rotation};
  };
  const frames = moduleFor('navigation-frames');
  if (frames) {
    const original = frames.render;
    Spatial.controls(frames, {azimuth: 35, elevation: 25});
    frames.spatial = 'Geocentric XYZ and rotating Earth-fixed axes';
    frames.render = (v, U) => {
      const result = original(v, U), g = framePosition(v), earth = 6378 / g.radius;
      const position = g.inertial.map(value => value / g.radius);
      const figure = Spatial.figure(U, v, {width: 800, height: 460, center: [280, 250], scale: 142,
        title: 'One position in two three-dimensional coordinate frames',
        label: 'Spherical Earth, inertial XYZ axes, rotating Earth-fixed axes and the position vector'}, scene => {
        let s = scene.sphere(earth) + scene.axes([0, 0, 0], 1.12, ['X', 'Y', 'Z = ZF']);
        const fixedX = [1.08 * Math.cos(g.rotation), 1.08 * Math.sin(g.rotation), 0];
        const fixedY = [-1.08 * Math.sin(g.rotation), 1.08 * Math.cos(g.rotation), 0];
        s += scene.arrow([0, 0, 0], fixedX, U.C.b) + scene.label(fixedX, 'XF', U.C.b, 9, 14);
        s += scene.arrow([0, 0, 0], fixedY, U.C.b) + scene.label(fixedY, 'YF', U.C.b, 9, 14);
        const surface = (latitude, longitude) => [earth * Math.cos(latitude) * Math.cos(longitude),
          earth * Math.cos(latitude) * Math.sin(longitude), earth * Math.sin(latitude)];
        s += scene.path(range(60, t => surface(-Math.PI / 2 + Math.PI * t, g.rotation)), U.C.b, 2);
        s += scene.path(range(60, t => surface(0, g.rotation + g.longitude * t)), U.C.c, 2);
        s += scene.path(range(45, t => surface(g.latitude * t, g.rotation + g.longitude)), U.C.d, 2);
        s += scene.arrow([0, 0, 0], position, U.C.a) + scene.point(position, U.C.a, 5);
        s += scene.line(position, [position[0], position[1], 0], U.C.a, 1, '5 4');
        s += scene.label(position, 'Position', U.C.a, 8, -10);
        s += U.text(515, 93, 'Earth-fixed position (km)');
        g.fixed.forEach((value, i) => {s += U.text(515, 125 + i * 30, ['xF', 'yF', 'zF'][i] + ' = ' + U.fmt(value, 1));});
        s += U.text(515, 245, 'Inertial position (km)');
        g.inertial.forEach((value, i) => {s += U.text(515, 277 + i * 30, ['X', 'Y', 'Z'][i] + ' = ' + U.fmt(value, 1));});
        s += U.text(45, 426, 'Orange axes and prime meridian turn about the shared Z axis.');
        return s;
      });
      return {...result, svg: figure + result.svg};
    };
    extendChecks(frames, () => {
      const p = framePosition({latitude: 30, longitude: 0, rotation: 90, altitude: 0});
      return [
        {name: 'Spatial ECEF quarter-turn sends fixed x to inertial Y and preserves Z',
          pass: Math.abs(p.inertial[0]) < 1e-9 && near(p.inertial[1], 6378 * Math.cos(Math.PI / 6)) && near(p.inertial[2], 3189)},
        {name: 'Spatial frame rotation preserves the full geocentric radius',
          pass: near(Math.hypot(...p.inertial), 6378)}
      ];
    });
  }

  const elevationGeometry = v => {
    const ratio = 6378 / v.r, gamma = rad(v.gamma);
    const station = [ratio, 0, 0], satellite = [Math.cos(gamma), Math.sin(gamma), 0];
    const horizontal = satellite[1], up = satellite[0] - ratio;
    return {ratio, gamma, station, satellite, horizontal, up,
      elevation: Math.atan2(up, horizontal)};
  };
  const look = moduleFor('look-triangle');
  if (look) {
    const original = look.render;
    Spatial.controls(look, {azimuth: -35, elevation: 25});
    look.spatial = 'Spherical Earth, station tangent plane and the elevation cross-section';
    look.render = (v, U) => {
      const result = original(v, U), g = elevationGeometry(v), p = g.station;
      const figure = Spatial.figure(U, v, {width: 800, height: 465, center: [285, 250], scale: 150,
        title: 'The station’s horizon is a plane tangent to spherical Earth',
        label: 'Earth and satellite in three-dimensional context with a local horizon plane, Up normal and line-of-sight components'}, scene => {
        let s = scene.sphere(g.ratio);
        s += scene.polygon([[p[0], -.55, -.4], [p[0], .95, -.4], [p[0], .95, .4], [p[0], -.55, .4]], U.C.b, .08, U.C.b);
        s += scene.line([0, 0, 0], g.satellite, U.C.muted, 1, '5 4');
        s += scene.line([0, 0, 0], p, U.C.muted, 1);
        s += scene.path(range(50, t => [g.ratio * .7 * Math.cos(g.gamma * t),
          g.ratio * .7 * Math.sin(g.gamma * t), 0]), U.C.muted, 1.5);
        s += scene.label([g.ratio * .83 * Math.cos(g.gamma / 2), g.ratio * .83 * Math.sin(g.gamma / 2), 0], 'γ', U.C.muted, -8, -10);
        const projection = [p[0], g.horizontal, 0];
        s += scene.line(p, projection, U.C.b, 2, '5 4');
        s += scene.line(projection, g.satellite, U.C.c, 2, '5 4');
        s += scene.line(p, g.satellite, g.elevation >= 0 ? U.C.a : U.C.d, 2, g.elevation >= 0 ? '' : '7 4');
        s += scene.arrow(p, [p[0] + .4, 0, 0], U.C.c);
        s += scene.label([p[0] + .4, 0, 0], 'Up', U.C.c, 10, -10);
        s += scene.arrow(p, [p[0], .48, 0], U.C.b);
        s += scene.label([p[0], .48, 0], 'Horizontal', U.C.b, -14, 18);
        s += scene.point(p, U.C.b, 5) + scene.label(p, 'Station', U.C.b, -22, 21);
        s += scene.point(g.satellite, U.C.a, 5) + scene.label(g.satellite, 'Satellite', U.C.a, 10, -12);
        s += U.text(505, 95, 'Earth center → station: RE');
        s += U.text(505, 131, 'Earth center → satellite: rs');
        s += U.text(505, 189, 'Ray = horizontal part + Up part');
        s += U.text(505, 225, 'Elevation = ' + U.fmt(U.deg(g.elevation), 2) + '°');
        s += U.text(505, 279, g.elevation >= 0 ? 'Ray clears the ideal spherical horizon.' : 'Dashed ray is blocked by Earth.');
        s += U.text(45, 430, 'The central angle fixes an elevation cross-section; azimuth is free in this model.');
        return s;
      });
      return {...result, svg: figure + result.svg};
    };
    extendChecks(look, () => {
      const horizon = elevationGeometry({r: 24000, gamma: Math.acos(6378 / 24000) * 180 / Math.PI});
      const overhead = elevationGeometry({r: 24000, gamma: 0});
      return [
        {name: 'Spatial look-angle horizon has zero Up component', pass: Math.abs(horizon.up) < 1e-12 && Math.abs(horizon.elevation) < 1e-12},
        {name: 'Spatial overhead ray is radial with90-degree elevation', pass: near(overhead.elevation, Math.PI / 2) && near(overhead.horizontal, 0)}
      ];
    });
  }

  const bearingGeometry = v => {
    const latitude = rad(v.Le), subpointLatitude = rad(v.Ls), longitudeDifference = rad(v.dl);
    const east = Math.cos(subpointLatitude) * Math.sin(longitudeDifference);
    const north = Math.sin(subpointLatitude) * Math.cos(latitude) -
      Math.cos(subpointLatitude) * Math.sin(latitude) * Math.cos(longitudeDifference);
    const magnitude = Math.hypot(east, north);
    return {east, north, magnitude, bearing: magnitude < 1e-10 ? null : (Math.atan2(east, north) + 2 * Math.PI) % (2 * Math.PI)};
  };
  const azimuth = moduleFor('azimuth-components');
  if (azimuth) {
    const original = azimuth.render;
    Spatial.controls(azimuth, {azimuth: -35, elevation: 25});
    azimuth.spatial = 'East-north horizon projection with its Up normal';
    azimuth.render = (v, U) => {
      const result = original(v, U), g = bearingGeometry(v), projected = [g.east, g.north, 0];
      const figure = Spatial.figure(U, v, {width: 800, height: 465, center: [285, 250], scale: 145,
        title: 'Azimuth belongs to the local east–north horizon plane',
        label: 'Three-dimensional local horizon plane and Up normal with east and north components of the horizontal ray projection'}, scene => {
        let s = scene.polygon([[-1.08, -1.08, 0], [1.08, -1.08, 0], [1.08, 1.08, 0], [-1.08, 1.08, 0]], U.C.c, .05, U.C.grid);
        s += scene.path(range(80, t => [Math.sin(2 * Math.PI * t), Math.cos(2 * Math.PI * t), 0]), U.C.grid, 1);
        s += scene.axes([0, 0, 0], 1.12, ['E', 'N', 'Up']);
        s += scene.line([0, 0, 0], [g.east, 0, 0], U.C.b, 2, '5 4');
        s += scene.line([g.east, 0, 0], projected, U.C.c, 2, '5 4');
        if (g.bearing !== null) {
          s += scene.path(range(70, t => [.58 * Math.sin(g.bearing * t), .58 * Math.cos(g.bearing * t), 0]), U.C.a, 2);
          s += scene.arrow([0, 0, 0], projected, U.C.a);
          s += componentLabel(scene, [0, 0, 0], projected, 'Horizontal projection', U.C.a, 32);
        }
        s += scene.point([0, 0, 0], U.C.ink, 4);
        s += U.text(515, 103, 'East component = ' + U.fmt(g.east, 3));
        s += U.text(515, 139, 'North component = ' + U.fmt(g.north, 3));
        s += U.text(515, 200, g.bearing === null ? 'Azimuth is undefined.' : 'Azimuth = ' + U.fmt(U.deg(g.bearing), 1) + '°');
        s += U.text(515, 237, 'Clockwise from local North');
        s += U.text(515, 296, 'Up is perpendicular to the horizon.');
        s += U.text(45, 430, 'The plotted vector is the horizontal projection; this model determines bearing.');
        return s;
      });
      return {...result, svg: figure + result.svg};
    };
    extendChecks(azimuth, () => {
      const east = bearingGeometry({Le: 0, Ls: 0, dl: 90});
      const south = bearingGeometry({Le: 30, Ls: 0, dl: 0});
      return [
        {name: 'Spatial ENU eastward projection has90-degree bearing', pass: near(east.east, 1) && near(east.north, 0) && near(east.bearing, Math.PI / 2)},
        {name: 'Spatial ENU equatorial subpoint is south of a northern station at the same longitude', pass: near(south.east, 0) && near(south.north, -.5) && near(south.bearing, Math.PI)}
      ];
    });
  }

  const skyDirections = v => Array.from({length: 6}, (_, i) => {
    const azimuth = rad(-v.spread / 2 + v.spread * i / 5);
    const elevation = rad(i % 2 ? Math.min(85, v.low + v.separation) : v.low);
    return {azimuth, elevation, point: [Math.cos(elevation) * Math.sin(azimuth),
      Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation)]};
  });
  const dop = moduleFor('gnss-dop-3d');
  if (dop) {
    const original = dop.render;
    Spatial.controls(dop, {azimuth: 35, elevation: 25});
    dop.spatial = 'Local ENU sky hemisphere and elevation-group geometry';
    dop.render = (v, U) => {
      const result = original(v, U), directions = skyDirections(v);
      const figure = Spatial.figure(U, v, {width: 800, height: 455, center: [285, 260], scale: 143,
        title: 'Elevation separates vertical position from receiver-clock bias',
        label: 'Three-dimensional ENU hemisphere with six line-of-sight directions and their vertical projections'}, scene => {
        const ring = elevation => range(80, t => [Math.cos(elevation) * Math.sin(2 * Math.PI * t),
          Math.cos(elevation) * Math.cos(2 * Math.PI * t), Math.sin(elevation)]);
        let s = scene.polygon(ring(0), U.C.c, .05, U.C.muted);
        for (const elevation of [0, 30, 60]) s += scene.path(ring(rad(elevation)), U.C.grid, 1);
        for (const azimuth of [0, 90, 180, 270]) s += scene.path(range(50, t => {
          const elevation = t * Math.PI / 2;
          return [Math.cos(elevation) * Math.sin(rad(azimuth)), Math.cos(elevation) * Math.cos(rad(azimuth)), Math.sin(elevation)];
        }), U.C.grid, 1);
        s += scene.axes([0, 0, 0], 1.15, ['E', 'N', 'U']);
        s += scene.path(ring(rad(v.low)), U.C.a, 1, '5 4');
        if (v.separation) s += scene.path(ring(rad(Math.min(85, v.low + v.separation))), U.C.b, 1, '5 4');
        directions.forEach(({point}, i) => {
          const color = i % 2 ? U.C.b : U.C.a;
          s += scene.line(point, [point[0], point[1], 0], U.C.muted, 1, '4 4');
          s += scene.arrow([0, 0, 0], point, color) + scene.point(point, color, 4.5);
          s += scene.label(point, String(i + 1), color, 8, -8);
        });
        s += scene.point([0, 0, 0], U.C.ink, 4);
        s += U.text(510, 100, 'Receiver at the ENU origin');
        s += U.text(510, 140, 'Lower group: ' + U.fmt(v.low, 0) + '° elevation');
        s += U.text(510, 174, 'Upper group: ' + U.fmt(Math.min(85, v.low + v.separation), 0) + '° elevation');
        s += U.text(510, 230, 'Vertical direction component = sin E');
        if (v.separation === 0) {
          s += U.text(510, 275, 'All rays end at the same height.');
          s += U.text(510, 309, 'Height and clock columns are dependent.');
        } else {
          s += U.text(510, 275, 'Two heights give different U components.');
          s += U.text(510, 309, 'Azimuth spread also affects conditioning.');
        }
        s += U.text(45, 425, 'Dashed drops show the horizontal projection of each unit ray.');
        return s;
      });
      return {...result, svg: figure + result.svg};
    };
    extendChecks(dop, () => {
      const rays = skyDirections({spread: 300, low: 20, separation: 35});
      const flat = skyDirections({spread: 300, low: 20, separation: 0});
      return [
        {name: 'Spatial GNSS ENU rays have unit length', pass: rays.every(ray => near(Math.hypot(...ray.point), 1))},
        {name: 'Equal GNSS elevations place every ray on one horizontal plane', pass: flat.every(ray => near(ray.point[2], Math.sin(rad(20))))}
      ];
    });
  }

  const passPosition = v => {
    const along = v.speed * v.time / 1000;
    return {position: [along, v.cross / 1000, .85],
      halfTrack: Math.max(1.2, Math.abs(along) + .35), cross: v.cross / 1000, height: .85};
  };
  const pass = moduleFor('doppler-pass');
  if (pass) {
    const original = pass.render;
    Spatial.controls(pass, {azimuth: 35, elevation: 25});
    pass.spatial = 'Altitude, cross-track offset and along-track motion in three perpendicular directions';
    pass.render = (v, U) => {
      const result = original(v, U), g = passPosition(v), x = g.position[0];
      const extent = Math.hypot(g.halfTrack + .8, g.cross + .5, g.height);
      const figure = Spatial.figure(U, v, {width: 800, height: 460, center: [355, 250], scale: 155 / extent,
        title: 'The line of sight combines altitude, cross-track offset and along-track motion',
        label: 'Three-dimensional straight satellite pass over a flat ground plane showing h, b, vt and slant range'}, scene => {
        let s = scene.polygon([[-g.halfTrack - .3, -.35, 0], [g.halfTrack + .3, -.35, 0],
          [g.halfTrack + .3, g.cross + .5, 0], [-g.halfTrack - .3, g.cross + .5, 0]], U.C.c, .06, U.C.grid);
        s += scene.line([-g.halfTrack, g.cross, 0], [g.halfTrack, g.cross, 0], U.C.muted, 1, '5 4');
        s += scene.arrow([-g.halfTrack, g.cross, g.height], [g.halfTrack, g.cross, g.height], U.C.a);
        s += scene.line([0, 0, 0], [0, g.cross, 0], U.C.c, 2);
        s += scene.line([0, g.cross, 0], [x, g.cross, 0], U.C.muted, 2);
        s += scene.line([x, g.cross, 0], g.position, U.C.d, 1.5, '5 4');
        s += scene.line([0, 0, 0], g.position, U.C.b, 2);
        s += scene.point([0, 0, 0], U.C.b, 5) + scene.label([0, 0, 0], 'Beacon', U.C.b, -54, 20);
        s += scene.point(g.position, U.C.a, 5) + scene.label(g.position, 'Satellite', U.C.a, 8, -10);
        s += componentLabel(scene, [x, g.cross, 0], g.position, 'h', U.C.d);
        s += componentLabel(scene, [0, 0, 0], [0, g.cross, 0], 'b', U.C.c);
        s += componentLabel(scene, [0, g.cross, 0], [x, g.cross, 0], 'vt', U.C.muted);
        s += componentLabel(scene, [0, 0, 0], g.position, 'r(t)', U.C.b, 24);
        s += U.text(45, 65, 'View refits; all dimensions share one scale. The ground is h = 0.');
        s += U.text(45, 405, 'h = 850 km; b = ' + U.fmt(v.cross, 0) + ' km; vt = ' + U.fmt(v.speed * v.time, 0) + ' km');
        s += U.text(45, 434, 'r(t) = ' + U.fmt(Math.hypot(...g.position) * 1000, 0) + ' km; motion is along the teal track.');
        return s;
      });
      return {...result, svg: result.svg.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/, figure),
        note: result.note + ' Altitude h, cross-track offset b and along-track motion vt are perpendicular in this model.'};
    };
    extendChecks(pass, () => {
      const at = passPosition({speed: 7.4, cross: 400, time: 250});
      const closest = passPosition({speed: 7.4, cross: 400, time: 0});
      return [
        {name: 'Spatial Doppler pass preserves independent altitude, cross-track and along-track dimensions',
          pass: near(at.position[0], 1.85) && near(at.position[1], .4) && near(at.position[2], .85)},
        {name: 'Spatial closest approach gives the original altitude/cross-track slant range',
          pass: near(Math.hypot(...closest.position) * 1000, Math.hypot(850, 400))}
      ];
    });
  }
})();
