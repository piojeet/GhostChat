import { LEAFLET_CSS, LEAFLET_JS } from './assets/leafletBundle';

export const LEAFLET_MAP_HTML = `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>${LEAFLET_CSS}
html,body,#map{width:100%;height:100%;margin:0;padding:0;background:#15191e;overflow:hidden}
.leaflet-container{background:#15191e;outline:0}
.leaflet-tile{filter:grayscale(.55) invert(.88) hue-rotate(180deg) brightness(.72) contrast(.82)}
.standard-map .leaflet-tile{filter:none}
.leaflet-control-attribution{display:none}
.friend-icon,.cluster-icon,.me-icon{background:none;border:0}
.friend-pin{width:48px;height:48px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden;border:3px solid #FFEA00;border-radius:50%;background:#101113;box-shadow:0 4px 12px #0009;color:#fff;font:700 13px sans-serif}
.friend-pin.stale{border-color:#858990}
.friend-pin.selected{border-color:#fff;transform:scale(1.12)}
.friend-pin img{width:100%;height:100%;object-fit:cover}
.cluster-pin{width:46px;height:46px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;border:3px solid #171819;border-radius:50%;background:#FFEA00;color:#151515;font:900 14px sans-serif}
.me-pin{width:24px;height:24px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;border:3px solid white;border-radius:50%;background:#3988FF;box-shadow:0 2px 8px #0008}
.me-pin:after{content:'';width:6px;height:6px;border-radius:50%;background:white}
</style>
</head>
<body>
<div id="map" aria-label="OpenStreetMap"></div>
<script>${LEAFLET_JS.replace(/<\/script/gi, '<\\/script')}</script>
<script>
(function(){
  var bridge=window.ReactNativeWebView;
  var map=L.map('map',{zoomControl:false,attributionControl:false,worldCopyJump:true}).setView([0,0],2);
  var tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors',crossOrigin:true});
  var friendLayer=L.layerGroup().addTo(map);
  var currentLayer=L.layerGroup().addTo(map);
  var friends=[];
  var selectedId=null;
  var tileCycleSucceeded=false;
  var tileErrors=0;
  var hasFittedFriends=false;
  var statusTimer=null;
  function send(value){if(bridge){bridge.postMessage(JSON.stringify(value));}}
  function startTileTimeout(){clearTimeout(statusTimer);statusTimer=setTimeout(function(){if(!tileCycleSucceeded){send({type:'tileStatus',status:'error'});}},10000);}
  tiles.on('loading',function(){tileCycleSucceeded=false;tileErrors=0;startTileTimeout();});
  tiles.on('tileload',function(){tileCycleSucceeded=true;clearTimeout(statusTimer);send({type:'tileStatus',status:'loaded'});});
  tiles.on('tileerror',function(){tileErrors+=1;});
  tiles.on('load',function(){clearTimeout(statusTimer);if(!tileCycleSucceeded && tileErrors>0){send({type:'tileStatus',status:'error'});}});
  tiles.addTo(map);
  startTileTimeout();
  function makeFriendMarker(friend){
    var icon=document.createElement('div');
    icon.className='friend-pin'+(friend.isStale?' stale':'')+(friend.userId===selectedId?' selected':'');
    if(typeof friend.avatar==='string' && /^https:\\/\\//i.test(friend.avatar)){
      var image=document.createElement('img');
      image.alt='';
      image.referrerPolicy='no-referrer';
      image.src=friend.avatar;
      image.onerror=function(){image.remove();icon.textContent=(friend.username||'?').slice(0,1).toUpperCase();};
      icon.appendChild(image);
    }else{
      icon.textContent=(friend.username||'?').slice(0,1).toUpperCase();
    }
    var marker=L.marker([friend.latitude,friend.longitude],{
      icon:L.divIcon({className:'friend-icon',html:icon,iconSize:[48,48],iconAnchor:[24,24]}),
      title:'@'+friend.username,
      keyboard:true
    });
    marker.on('click',function(){send({type:'friendPress',userId:friend.userId});});
    return marker;
  }
  function renderFriends(){
    friendLayer.clearLayers();
    var groups=[];
    friends.forEach(function(friend){
      var point=map.latLngToContainerPoint([friend.latitude,friend.longitude]);
      var group=groups.find(function(item){return Math.hypot(point.x-item.x,point.y-item.y)<=58;});
      if(group){group.friends.push(friend);group.x=(group.x*(group.friends.length-1)+point.x)/group.friends.length;group.y=(group.y*(group.friends.length-1)+point.y)/group.friends.length;}
      else{groups.push({x:point.x,y:point.y,friends:[friend]});}
    });
    groups.forEach(function(group){
      if(group.friends.length===1){friendLayer.addLayer(makeFriendMarker(group.friends[0]));return;}
      var center=group.friends.reduce(function(sum,item){return [sum[0]+item.latitude/group.friends.length,sum[1]+item.longitude/group.friends.length];},[0,0]);
      var badge=document.createElement('div');
      badge.className='cluster-pin';
      badge.textContent=String(group.friends.length);
      var marker=L.marker(center,{icon:L.divIcon({className:'cluster-icon',html:badge,iconSize:[46,46],iconAnchor:[23,23]}),keyboard:true,title:group.friends.length+' friends'});
      marker.on('click',function(){map.fitBounds(L.latLngBounds(group.friends.map(function(item){return [item.latitude,item.longitude];})),{padding:[64,64],maxZoom:18});});
      friendLayer.addLayer(marker);
    });
  }
  function renderCurrent(location){
    currentLayer.clearLayers();
    if(!location){return;}
    var pin=document.createElement('div');pin.className='me-pin';
    currentLayer.addLayer(L.marker([location.latitude,location.longitude],{
      icon:L.divIcon({className:'me-icon',html:pin,iconSize:[24,24],iconAnchor:[12,12]}),
      title:'Your location',keyboard:false
    }));
  }
  function receive(event){
    var message;
    try{message=JSON.parse(event.data);}catch(_error){return;}
    if(!message || typeof message!=='object'){return;}
    if(message.type==='mapData' && Array.isArray(message.friends)){
      friends=message.friends.filter(function(item){
        return item && typeof item.userId==='string' && /^[a-f\\d]{24}$/i.test(item.userId) &&
          typeof item.username==='string' && Number.isFinite(item.latitude) && Math.abs(item.latitude)<=90 &&
          Number.isFinite(item.longitude) && Math.abs(item.longitude)<=180 && typeof item.isStale==='boolean';
      });
      selectedId=typeof message.selectedId==='string'?message.selectedId:null;
      renderFriends();
      renderCurrent(message.currentLocation);
      if(!hasFittedFriends && friends.length){
        hasFittedFriends=true;
        map.fitBounds(L.latLngBounds(friends.map(function(item){return [item.latitude,item.longitude];})),{padding:[72,72],maxZoom:15});
      }
    }else if(message.type==='focus' && Number.isFinite(message.latitude) && Math.abs(message.latitude)<=90 &&
        Number.isFinite(message.longitude) && Math.abs(message.longitude)<=180){
      map.flyTo([message.latitude,message.longitude],Math.max(map.getZoom(),15),{duration:.45});
    }else if(message.type==='style'){
      document.getElementById('map').classList.toggle('standard-map',message.style==='standard');
    }else if(message.type==='retry'){
      tileCycleSucceeded=false;tileErrors=0;tiles.redraw();startTileTimeout();
    }
  }
  document.addEventListener('message',receive);
  window.addEventListener('message',receive);
  map.on('zoomend moveend',renderFriends);
  requestAnimationFrame(function(){requestAnimationFrame(function(){send({type:'ready'});});});
  window.addEventListener('online',function(){tileCycleSucceeded=false;tileErrors=0;tiles.redraw();});
})();
</script>
</body>
</html>`;
