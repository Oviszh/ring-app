const test=require('node:test'),assert=require('node:assert/strict')
const copy=x=>JSON.parse(JSON.stringify(x))
test('store：持久化重启、目标快照、写入失败回滚',()=>{
 let saved=null,fail=false
 global.wx={getStorageSync:()=>saved&&copy(saved),setStorageSync:(k,v)=>{if(fail)throw new Error('quota');saved=copy(v)},showModal:()=>{}}
 const {createStore}=require('../miniprogram/services/store');const s=createStore()
 const p=s.addPractice({name:'测试',dailyTarget:108})
 s.startRound('phone',p.id);s.tap('phone');s.addEntry({practiceId:p.id,date:s.todayKey(),amount:107});s.setDailyTarget(p.id,500)
 assert.equal(s.dayTotals(s.todayKey(),p.id).target,500)
 assert.equal(createStore().practiceTotalsAll(p.id).total,108)
 assert.equal(createStore().dayTotals(s.todayKey(),p.id).target,500)
 fail=true;assert.throws(()=>s.setDailyTarget(p.id,1000),/quota/)
 assert.equal(s.dayTotals(s.todayKey(),p.id).target,500)
 assert.equal(s.getPractice(p.id).dailyTarget,500)
 fail=true;assert.throws(()=>s.addEntry({practiceId:p.id,date:s.todayKey(),amount:10}),/quota/)
 assert.equal(s.practiceTotalsAll(p.id).total,108)
 delete global.wx
})
test('页面：所有 WXML 事件都有真实处理函数',()=>{
 const fs=require('fs'),path=require('path'),vm=require('vm');const root=path.resolve(__dirname,'../miniprogram/pages')
 for(const name of fs.readdirSync(root)) {
  const dir=path.join(root,name), js=path.join(dir,name+'.js'), xml=path.join(dir,name+'.wxml');if(!fs.existsSync(js))continue
  let page;vm.runInNewContext(fs.readFileSync(js,'utf8'),{require:require('node:module').createRequire(js),getApp:()=>({globalData:{store:{}}}),Page:p=>{page=p}})
  const events=[...fs.readFileSync(xml,'utf8').matchAll(/(?:bind|catch)(?:tap|input|change|blur|confirm|touchmove)="([\w]+)"/g)].map(x=>x[1])
  for(const event of events)assert.equal(typeof page[event],'function',name+': '+event)
 }
})
