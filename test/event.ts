import chai = require('chai');
import streamMod from '../src/event';
import * as variable from '../src/variable';

var expect = chai.expect;

describe("stream", function(){
	it ("should subscribe observers", function(){
		var stream = streamMod<number>();
		var events: number[] = [];
		var canc = stream.observe(function(ev: number){
			events.push(ev);
		});
		stream.fire(3);
		expect(events).to.deep.equal([3]);
		stream.fire(6);
		expect(events).to.deep.equal([3, 6]);
		canc.cancel();
		stream.fire(7);
		expect(events).to.deep.equal([3, 6]);
	});
	
	it("should add observers only once", function(){
		var events: number[] = [];
		var obs = function(ev: number){
			events.push(ev);
		};
		var stream = streamMod();
		stream.observe(obs);
		stream.observe(obs);
		stream.fire(2);
		expect(events).to.deep.equal([2]);
	});	
	
	it("should remove observers", function(){
		var events: number[] = [];
		var obs = function(ev: number){
			events.push(ev);
		}; 
		var stream = streamMod();
		stream.observe(obs);
		stream.fire(2);
		stream.unobserve(obs);
		stream.fire(3);
		expect(events).to.deep.equal([2]);
	});
	
	it("should ignore unknown observers", function(){
		streamMod().unobserve(function(){
			
		});
	});

});