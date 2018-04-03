import chai = require('chai');
import reactive from "../src/main";
import * as reactiveMod from "../index";
import procedure, {Procedure} from "../src/procedure";
import * as procedureMod from "../src/procedure";
var expect = chai.expect;

describe("procedure", function(){
	it("should listen to changes", function(){
		var v1 = reactive(1);
		var res = 0;
		var p = procedure(function(){
			res = v1.value + 1;
		});
		expect(res).to.equal(2);
		v1.value = 33;
		expect(res).to.equal(34);
	});
	
	it("should require to pass a listener", function(){
        var success = false;
		try{
			procedure(null);
            success = true;
		}catch(error)
		{
		}
        expect(success).to.be.false;
	});
	
	describe("listener", function(){
		it("should be an alias to constructor", function(){
			var p = procedureMod.listener(function(){
				
			});
			expect((<Procedure>p).$r).not.to.be.null;

		});
	});

	describe("update", function(){
		it("should immediately execute the procedure listener", function(){
			var v1 = reactive(1);
			var v2 = reactive(2);
			var p = procedure(function(){
				v1.value = v2.value + 1;
			});
			reactiveMod.transaction(function(){
				v2.value = 4;
				p.update();
				expect(v1.value).to.equal(5);
			});
			reactiveMod.transaction(function(){
				v2.value = 7;
				expect(v1.value).to.equal(5);
				p.update();
				expect(v1.value).to.equal(8);
				v2.value = 17;
				expect(v1.value).to.equal(8);
			});
			expect(v1.value).to.equal(18);
		});
	});
	
	describe("markChanged", function(){
		it("should trigger children if this function is called", function(){
			var p1 = procedure(function(p){
				(<Procedure>p).$r.changedDirty();
			});
			var nr = 0;
			var p2 = procedure(function(p){
				nr++;
                (<Procedure>p1).$r.observed();
			});
			expect(nr).to.equal(1);
            (<Procedure>p1).$r.changedDirty();
			expect(nr).to.equal(2);
		});
	});

	describe("once", function(){
		it("should be active until transaction ends", function(){
			var v1 = reactive(1);
			var v2 = reactive(2).listener(function(v){
				v.value = v1.value + 3;
			});
			var v3 = reactive(0);
			reactiveMod.transaction(function(){
				v1.value = 3;
				procedureMod.once(function(){
					v3.value = v2.value;
				});
			});
			expect(v2.value).to.equal(6);
			expect(v3.value).to.equal(6);
			v1.value = 10;
			expect(v3.value).to.equal(6);
		});
	});

    function greaterRank(o1, o2){
        return expect(o1.$r._crank).to.gt(o2.$r._crank);
    }


    describe("noChanges", function(){
		it("should not track changes", function(){
            var v1 = reactive(1);
            var v2 = reactive(2);
            var r1 = v1.$r._crank;
            var r2 = v2.$r._crank;
            if (r2 >= r1){
                var p = procedureMod.noChanges(function(){
					v1.value = v2.value;
                });
                greaterRank(p, v2);
                expect(r1).to.eq(v1.$r._crank);
            }
            else {
                var p = procedureMod.noChanges(function(){
					v2.value = v1.value;
                });
                greaterRank(p, v1);
                expect(r1).to.eq(v2.$r._crank);
            }
		});
	});
	
});