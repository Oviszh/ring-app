'use strict'
let voices = []
let current = ''
let next = 0
function destroy() { voices.forEach(v=>v.destroy()); voices=[]; current='' }
function play(settings) {
  const name=settings.soundName || 'muyu'
  if(!settings.sound || name==='silent' || !wx.createInnerAudioContext) return
  if(current!==name) {
    destroy();current=name
    voices=Array.from({length:3},()=>{
      const audio=wx.createInnerAudioContext()
      audio.src=`/assets/audio/${name==='qing'?'qing':'muyu'}.wav`
      audio.volume=0.55
      audio.onError(()=>{})
      return audio
    })
  }
  const voice=voices[next++ % voices.length]
  voice.stop();voice.play()
}
module.exports = { play, destroy }
