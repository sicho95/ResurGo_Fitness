  // ResurGo — données multisources. Pure selection, never fill missing data.
  const SENSOR_PRIORITIES={
    heartRate:["chest_strap","watch","fitness_machine","phone"],
    speed:["watch_gps","phone_gps","fitness_machine","bike_wheel"],
    distance:["watch_gps","phone_gps","fitness_machine","bike_wheel"],
    altitude:["watch_barometer","phone_barometer","watch_gps","phone_gps"],
    cadence:["dedicated_cadence","watch","fitness_machine","phone"],
    power:["power_meter","fitness_machine","estimated"]
  };
  function chooseSensorMetric(metric, samples, now=Date.now()){
    const order=SENSOR_PRIORITIES[metric]||[];
    const usable=(samples||[]).filter(s=>s&&s.metric===metric&&
      typeof s.value==="number"&&Number.isFinite(s.value)&&
      typeof s.timestamp==="number"&&now-s.timestamp>=0&&
      now-s.timestamp<=(s.maxAgeMs||7000)&&s.accuracy!==false);
    if(!usable.length)return {available:false,metric,source:null,value:null,reason:"aucune source fraîche"};
    usable.sort((a,b)=>{
      const ar=order.indexOf(a.sourceType),br=order.indexOf(b.sourceType);
      const ap=ar<0?999:ar,bp=br<0?999:br;
      if(ap!==bp)return ap-bp;
      if(a.quality!==b.quality)return (b.quality||0)-(a.quality||0);
      return b.timestamp-a.timestamp;
    });
    const best=usable[0];
    return {available:true,metric,value:best.value,source:best.sourceType,
      deviceId:best.deviceId||null,confidence:best.quality??null,
      ageMs:now-best.timestamp};
  }
  function sensorAccept(state, sample){
    if(!sample?.metric||!Number.isFinite(sample?.value))return state;
    const list=state[sample.metric]||[];
    const deduplicated=list.filter(x=>x.deviceId!==sample.deviceId||
      x.sourceType!==sample.sourceType);
    deduplicated.push({...sample});
    state[sample.metric]=deduplicated;
    return state;
  }
