"use strict";

function normval(el, origval) {
    var val = Number(origval)

    var id = $(el).prop('id')
    var isrot = id.indexOf('rot') >= 0

    if(!isNaN(val) && isFinite(val) && String(origval).trim()) {
        if(isrot) {
            if(val < 0) {
                return 360 - ((-val) % 360)
            } else {
                return val % 360;
            }
        } else {
            if(val < 0.01) {
                return 0.01;
            } else {
                return val;
            }
        }
    }
    if(isrot) {
        return 0;
    } else {
        return 1;
    }
}

function retrval(el) {
    return normval(el, $(el).val())
}

function setupButtons(control,
        lab1, how1,
        lab2, how2,
        lab3, how3,
        lab4, how4) {

    function changeval(how) {
        var val = retrval(control)
        val = how(val)
        val = normval(control, val)
        $(control).val(val)
    }

    var op1 = function() { changeval(how1); }
    var op2 = function() { changeval(how2); }
    var op3 = function() { changeval(how3); }
    var op4 = function() { changeval(how4); }

    $(control).keydown(function(e) {
        // 37=left, 38=up, 39=right, 40=down, 33=pgup, 34=pgdown
        switch(e.which) {
            case 33: op3(); break;
            case 34: op4(); break;
            case 40: op2(); break;
            case 38: op1(); break;
            default: return
        }
        e.preventDefault();
    });

    $(control).after($("<input type='button' value='"+lab4+"'>").click(op4));
    $(control).after($("<input type='button' value='"+lab3+"'>").click(op3));
    $(control).after($("<input type='button' value='"+lab2+"'>").click(op2));
    $(control).after($("<input type='button' value='"+lab1+"'>").click(op1));
    $(control).focusout(function() { $(control).val(retrval(control)) })

}

$(document).ready(function() {
    $(".rotation").each(function(idx) {
        $(this).val(retrval(this))
        setupButtons(this,
            "+1", function(v) { return v+1 },
            "-1", function(v) { return v-1 },
            "+45", function(v) { return v+45 },
            "-45", function(v) { return v-45 });
    });
    $(".scale").each(function(idx) {
        $(this).val(retrval(this))
        setupButtons(this,
            "+0.1", function(v) { return (Math.round(v*10)+1)/10 },
            "-0.1", function(v) { return (Math.round(v*10)-1)/10 },
            "*2", function(v) { return v*2 },
            "/2", function(v) { return v/2 });
    });
});
