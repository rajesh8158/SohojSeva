module.exports = function makeRef(service) {
  const p = ({'flight':'TRV','train':'TRN','hospital':'HSP','visa':'VSA'})[service] || 'GEN';
  return `${p}-${Date.now().toString().slice(-6)}${Math.floor(Math.random()*90+10)}`;
};
