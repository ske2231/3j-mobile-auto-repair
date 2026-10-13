/* 3J Mobile Auto Repair LLC - estimate engine (v1).
   Ported from the Auto Repair Estimator artifact: 23-job labor quick-reference,
   vehicle-based pricing multipliers, and labor + parts + markup + tax math.
   Adds: fixed truck roll fee and optional emergency surcharge. */
(function () {
  'use strict';

  var LABOR_REFERENCE = [
    { job: 'Diagnostic scan / inspection', min: 0.5, max: 1.0, category: 'maintenance', scope: 'Basic scan and inspection; complex diagnosis takes longer.' },
    { job: 'Engine oil & filter', min: 0.3, max: 0.5, category: 'maintenance', scope: 'Standard service; inspection or rotation is additional.' },
    { job: 'Tire rotation', min: 0.3, max: 0.5, category: 'maintenance', scope: 'Four tires; excludes balance and alignment.' },
    { job: 'Battery replacement', min: 0.3, max: 0.5, category: 'electrical', scope: 'Under-hood battery; hidden batteries or registration take longer.' },
    { job: 'Brake pads - one axle', min: 0.8, max: 1.5, category: 'brakes', scope: 'Front or rear axle; caliper service included.' },
    { job: 'Brake pads & rotors - one axle', min: 1.5, max: 2.5, category: 'brakes', scope: 'Front or rear axle; seized hardware can add time.' },
    { job: 'Brake caliper - one', min: 1.0, max: 3.0, category: 'brakes', scope: 'One side including bleed; corrosion can add time.' },
    { job: 'Alternator', min: 1.0, max: 2.5, category: 'electrical', scope: 'Access-driven; buried units can exceed 3 hours.' },
    { job: 'Starter motor', min: 1.0, max: 3.0, category: 'electrical', scope: 'Access-driven; under-intake units trend higher.' },
    { job: 'Serpentine belt', min: 0.5, max: 1.0, category: 'engine', scope: 'Single belt; multiple belts or tensioner work adds time.' },
    { job: 'Thermostat', min: 1.0, max: 2.0, category: 'cooling', scope: 'Location varies sharply; buried units may take 3-5+ hours.' },
    { job: 'Radiator', min: 2.0, max: 4.0, category: 'cooling', scope: 'Includes coolant service; bumper removal can add time.' },
    { job: 'Water pump', min: 1.5, max: 4.0, category: 'cooling', scope: 'External pumps are faster; timing-belt-driven pumps take longer.' },
    { job: 'Spark plugs - set', min: 1.0, max: 2.0, category: 'engine', scope: 'Intake removal on some V6/V8 engines may push 3.5 hours.' },
    { job: 'Ignition coil - one', min: 0.3, max: 1.0, category: 'engine', scope: 'Accessible coil; intake removal may add time.' },
    { job: 'Wheel bearing / hub - one', min: 1.0, max: 2.5, category: 'suspension', scope: 'Bolt-on hub; press-in bearings can reach 4 hours.' },
    { job: 'CV axle - one', min: 1.0, max: 2.0, category: 'drivetrain', scope: 'One side; seized axle nuts or splines add time.' },
    { job: 'Strut assembly - one', min: 1.5, max: 2.5, category: 'suspension', scope: 'Per corner; alignment is separate.' },
    { job: 'Control arm - one', min: 1.0, max: 2.5, category: 'suspension', scope: 'Per side; alignment is separate.' },
    { job: 'Fuel pump', min: 2.0, max: 4.0, category: 'engine', scope: 'Tank-drop access; access-panel designs may be near 1 hour.' },
    { job: 'Valve cover gasket', min: 1.5, max: 3.5, category: 'engine', scope: 'Engine layout matters; some V6/V8 jobs can reach 6 hours.' },
    { job: 'Timing belt', min: 3.0, max: 7.0, category: 'engine', scope: 'Engine-specific; inspect overlap with water pump and seals.' },
    { job: 'A/C compressor', min: 2.0, max: 4.0, category: 'climate', scope: 'R&R only; recovery, evacuation, and recharge are additional.' }
  ];

  function midpoint(item) {
    return Math.round(((item.min + item.max) / 2) * 10) / 10;
  }

  function num(v) { var n = parseFloat(v); return isFinite(n) && n >= 0 ? n : 0; }

  /* Vehicle-based multipliers, ported from the artifact's getVehicleAdjustment(). */
  function vehicleFactors(opts) {
    var typeFactors = {
      compact: [0.95, 0.94], sedan: [1, 1], suv: [1.08, 1.08],
      truck: [1.14, 1.12], van: [1.12, 1.10], performance: [1.25, 1.22]
    };
    var engineFactors = {
      i4: [1, 1], v6: [1.08, 1.06], v8: [1.18, 1.12],
      diesel: [1.25, 1.20], hybrid: [1.18, 1.18], ev: [1.15, 1.22]
    };
    var driveFactors = { fwd: [1, 1], rwd: [1.03, 1.02], awd: [1.12, 1.08], '4wd': [1.15, 1.10] };
    var tf = typeFactors[opts.type] || typeFactors.sedan;
    var ef = engineFactors[opts.engine] || engineFactors.i4;
    var df = driveFactors[opts.drivetrain] || driveFactors.fwd;
    var labor = tf[0] * ef[0] * df[0];
    var parts = tf[1] * ef[1] * df[1];
    var make = (opts.make || '').toLowerCase();
    var model = (opts.model || '').toLowerCase();
    var premium = ['acura','alfa romeo','audi','bmw','cadillac','genesis','infiniti','jaguar','land rover','lexus','lincoln','maserati','mercedes','mini','porsche','tesla','volvo'];
    var exotic = ['aston martin','bentley','ferrari','lamborghini','lotus','mclaren','rolls-royce'];
    if (exotic.indexOf(make) !== -1) { labor *= 1.40; parts *= 1.55; }
    else if (premium.indexOf(make) !== -1) { labor *= 1.10; parts *= 1.14; }
    if (/\b(amg|type r|srt|hellcat|raptor|corvette|gt-r|gtr|911|m[2-8]|rs[3-7])\b/.test(model)) { labor *= 1.10; parts *= 1.12; }
    var year = parseInt(opts.year, 10);
    if (isFinite(year) && year > 1900 && year <= 2010) { labor *= 1.08; parts *= 1.04; }
    return { labor: Math.round(labor * 100) / 100, parts: Math.round(parts * 100) / 100 };
  }

  /* Full estimate math. opts: laborHours, laborRate, partsCost, markupPct,
     suppliesPct, taxPct, truckRoll, emergency(bool), emergencyFee.
     Labor/parts get vehicle-adjusted like the artifact; truck roll and the
     emergency fee are flat. Tax applies to parts + fees + supplies. */
  function calculateEstimate(opts, factors) {
    var labor = num(opts.laborHours) * num(opts.laborRate) * (factors ? factors.labor : 1);
    var partsBase = num(opts.partsCost) * (factors ? factors.parts : 1);
    var parts = partsBase * (1 + num(opts.markupPct) / 100);
    var fees = num(opts.truckRoll) + (opts.emergency ? num(opts.emergencyFee) : 0);
    var supplies = labor * num(opts.suppliesPct) / 100;
    var taxable = parts + fees + supplies;
    var tax = taxable * num(opts.taxPct) / 100;
    var total = labor + parts + fees + supplies + tax;
    return { labor: labor, parts: parts, fees: fees, supplies: supplies,
             tax: tax, total: total, markup: parts - partsBase };
  }

  window.EstimateEngine = {
    jobs: LABOR_REFERENCE,
    midpoint: midpoint,
    vehicleFactors: vehicleFactors,
    calculate: calculateEstimate
  };
})();
