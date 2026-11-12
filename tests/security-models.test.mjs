/** Independent numerical anchors for the public security teaching models. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context={window:{CourseFigureRegistry:[]}};
vm.runInNewContext(await readFile('src/security-models.js','utf8'),context);
const M=context.window.CourseSecurityMath;
assert.equal(context.window.CourseFigureRegistry.length,11);
const near=(actual,expected,relative=1e-12)=>assert.ok(Math.abs(actual-expected)<=relative*Math.max(1,Math.abs(expected)),`${actual} ≈ ${expected}`);
// Square-and-multiply reference computed independently with BigInt.
for(let a=1;a<=20;a++)for(let b=1;b<=20;b++)assert.equal(M.modpow(M.modpow(5,a,23),b,23),Number((5n**BigInt(a*b))%23n));
assert.equal(M.tcp(1200,4600,75,30).serverAck,1275);
assert.equal(M.tcp(1200,4600,75,30).serverSeq,4600);
assert.equal(M.tcp(1200,4600,75,30).nextServer,4630);
assert.equal(M.tcp(4294967295,0,1,0).serverAck,0);
assert.equal(M.budget(2400,3600),3600);
assert.equal(M.budget(1200,4000),0);
near(M.password(20,1000,4),131.072);
near(M.flood(25,1000,40).pps,3125);
near(M.flood(25,1000,40).victimMbps,1000);
assert.equal(M.worm(3,4,12,1000),24);
assert.equal(M.worm(3,4,60,1000),1000);
assert.equal(M.bestRoute(200,0,1).best,'A');
assert.equal(M.bestRoute(100,0,1).best,'B');
assert.equal(M.bestRoute(200,1,0).forward,'C');
assert.equal(M.bestRoute(200,1,1).forward,'A');
near(M.dns(1,16),1/4294967296);
near(M.dns(1000,0),1-Math.pow(65535/65536,1000));
// Compare the birthday approximation with exact independent occupancy probability.
let unique=1;for(let k=0;k<300;k++)unique*=1-k/65536;
assert.ok(Math.abs(M.birthday(300,16)-(1-unique))<.0006);
assert.equal(M.birthday(65537,16),1);
for(const model of context.window.CourseFigureRegistry)for(const check of model.checks?.()||[])assert.equal(check.pass,true,model.id+': '+check.name);
console.log('PASS 11 security model registrations, exact numerical anchors, 400 DH pairs and invariants');
