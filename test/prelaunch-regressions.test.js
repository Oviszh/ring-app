'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module')
const root=path.resolve(__dirname,'..')
function vowPage(store){const f=path.join(root,'miniprogram/pages/vow-new/vow-new.js');let spec;vm.runInNewContext(fs.readFileSync(f,'utf8'),{require:createRequire(f),getApp:()=>({globalData:{store}}),Page:p=>spec=p,wx:{showToast(){},navigateBack(){}}});return Object.assign({},spec,{data:Object.assign({},spec.data,{target:'100',name:'心经100部',existingTotal:'0',startDate:'2026-10-25',practices:[{id:'p'}],practiceIndex:0}),setData(p){Object.assign(this.data,p)}})}
test('新建大愿快速连点只写入一次，返回表单后可再次提交',()=>{let writes=0;const p=vowPage({createVow(){writes++}});p.onSubmit();p.onSubmit();assert.equal(writes,1);p.onShow();p.onSubmit();assert.equal(writes,2)})
test('大愿校验与保存失败不会锁死重试，修改大愿同样防重复',()=>{let writes=0,fail=true;const p=vowPage({createVow(){if(fail)throw Error('quota');writes++},updateVow(){writes++}});p.data.target='0';p.onSubmit();assert.equal(writes,0);p.data.target='100';p.onSubmit();fail=false;p.onSubmit();p.onSubmit();assert.equal(writes,1);p.onShow();p.data.isEdit=true;p.data.editId='v';p.onSubmit();p.onSubmit();assert.equal(writes,2)})

test('专修达标只提醒一次，结束入口与计数保留；重启不重复提醒，新一轮可再提醒',()=>{
  const copy=x=>JSON.parse(JSON.stringify(x));let saved=null,notices=0
  global.wx={getStorageSync:()=>saved&&copy(saved),setStorageSync:(k,v)=>{saved=copy(v)},showModal:()=>notices++,vibrateLong(){}}
  try {
    const {createStore}=require('../miniprogram/services/store'),s=createStore(),p=s.addPractice({name:'念佛',unit:'声'})
    s.startRound('phone',p.id,{type:'count',value:2});s.tap('phone');s.tap('phone');s.pulse();s.pulse()
    assert.equal(notices,1);assert.equal(s.context('phone').reminder.type,'count');assert.equal(s.reminderRemaining('phone').done,true)
    const resumed=createStore();resumed.resume();resumed.pulse();assert.equal(notices,1)
    resumed.cancelReminder('phone');assert.equal(resumed.context('phone').roundCount,2);assert.equal(resumed.dayTotals(resumed.todayKey(),p.id).total,2)
    resumed.startRound('phone',p.id,{type:'count',value:1});resumed.tap('phone');resumed.pulse();assert.equal(notices,2)
    assert.equal(resumed.dayTotals(resumed.todayKey(),p.id).total,3)
  } finally {delete global.wx}
})

test('静坐专修到时后保留会话，明确结束才归档座数',()=>{
  let notices=0;global.wx={getStorageSync:()=>null,setStorageSync(){},showModal(){notices++},vibrateLong(){}}
  try {
    const {createStore}=require('../miniprogram/services/store'),s=createStore(),p=s.addPractice({name:'静坐',type:'time',unit:'分钟'})
    s.startRound('phone',p.id,{type:'time',value:1})
    const ctx=s.context('phone');ctx.startTs-=61000;ctx.creditedTs=ctx.startTs
    s.pulse();s.pulse();assert.equal(notices,1);assert.ok(s.context('phone').reminder)
    s.endRound('phone');assert.equal(s.context('phone'),null)
    const totals=s.dayTotals(s.todayKey(),p.id);assert.equal(totals.times,1);assert.ok(totals.durationMin>=1)
  } finally {delete global.wx}
})
