import chai = require('chai');
import reactive from '../index';
import {transaction as inTransaction} from '../src/main';
import variable from '../src/variable';
import * as variableMod from '../src/variable';
var expect = chai.expect;

describe("variable", function(){
	
	it("should only fire if objects are different", function(){
		var v = variable(4);
		var nr = 0;
		reactive(function(){
			nr++;
			v.value;
		});
		expect(nr).to.equal(1);
		v.value = 5;
		expect(nr).to.equal(2);
		v.value = 5;
		expect(nr).to.equal(2);
	});
	
	describe("transform", function(){
		it("should create a new variable if value is not variable", function(){
			var v = variableMod.transform(4);
			expect(v.value).to.equal(4);
		});
		it("shouldn't do anything if value is variable", function(){
			var v = variable(2);
			var nv = variableMod.transform(v);
			expect(nv).to.equal(v);
		});
	});

	describe("update", function(){
		it("should manually update variable", function(){
			var v = variable(2);
			var v2 = variableMod.fromFunction(function(){
				return v.value + 1;
			});
			inTransaction(function(){
				v.value = 5;
				expect(v2.value).to.equal(3);
				v2.update();
				expect(v2.value).to.equal(6);
			});
		});
	});

	describe("function", function(){
		it("should set value by return value", function(){
			var v = variableMod.fromFunction(function(){
				return 2;
			});
			expect(v.value).to.equal(2);
		});
	});
	
	describe("defineProperty", function(){
		it("should define reactive property", function(){
			var obj: any = {
				
			};
			variableMod.defineProperty(obj, "a", variable(32));
			var a = 0;
			reactive(function(){
				a = obj.a;
			});
			obj.a = 44;
			expect(a).to.equal(44);
		});
		
		it("options can be specified", function(){
			var obj = {
				
			};
			variableMod.defineProperty(obj, "a", variable(32), {
				enumerable: false
			});
			var props = [];
			for (var p in obj)
			{
				props.push(p);
			}
			expect(props.length).to.equal(0);
		});
	});
	
	describe("transformProperties", function(){
		it("should transform all properties to variables", function(){
			var obj = {
				a: 5,
				b: 6
			};
			variableMod.transformProperties(obj);
			var a = 0;
			var b = 0;
			reactive(function(){
				a = obj.a;
			});
			reactive(function(){
				b = obj.b;
			});
			obj.a = 10;
			obj.b = 20;
			expect(a).to.equal(10);
			expect(b).to.equal(20);
		});
	});
	
});