"use strict";

function roundTo(n, places) {
    var big = 1;
    for(; places > 0; --places) 
        big *= 10;

    return Math.round(n*big)/big;
}

function normval(el, origval) {
    var val = Number(origval)

    var id = $(el).prop('class')
    var isrot = id.indexOf('rotation') >= 0
    var isscale = id.indexOf('scale') >= 0
    var isposition = id.indexOf('position') >= 0
    var iscut = id.indexOf('cut') >= 0

    if(!isNaN(val) && isFinite(val) && String(origval).trim()) {
        if(isrot) {
            if(val < 0) {
                return 360 - ((-val) % 360)
            } else {
                return val % 360;
            }
        }
        if(isscale) {
            if(val < 0.01) {
                return 0.01;
            } else {
                return val;
            }
        }
        if(isposition || iscut) {
            return val;
        }
    } else {
        if(isscale) {
            return 1;
        } else {
            return 0;
        }
    }
}

function retrval(el) {
    return normval(el, $(el).val())
}

function setupButtons(control,
        lab1, how1,
        lab2, how2,
        lab3, how3,
        lab4, how4,
        remove) {

    $(control).change(scheduleRecalc)
    $(control).val(retrval(control))

    function changeval(how) {
        scheduleRecalc()
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
        console.log(e.which)
        // 37=left, 38=up, 39=right, 40=down, 33=pgup, 34=pgdown, 27=esc
        switch(e.which) {
            case 33: op3(); break;
            case 34: op4(); break;
            case 40: op2(); break;
            case 38: op1(); break;
            case 27: if(remove) { remove(); break; }
            // else fallthrough
            default: return
        }
        e.preventDefault();
    });

    if(remove) {
        $(control).after($("<input type='button' tabindex='-1' class='plusminusbutton' value='X'>").click(remove));
    }
    $(control).after($("<input type='button' tabindex='-1' class='plusminusbutton' value='"+lab4+"'>").click(op4));
    $(control).after($("<input type='button' tabindex='-1' class='plusminusbutton' value='"+lab3+"'>").click(op3));
    $(control).after($("<input type='button' tabindex='-1' class='plusminusbutton' value='"+lab2+"'>").click(op2));
    $(control).after($("<input type='button' tabindex='-1' class='plusminusbutton' value='"+lab1+"'>").click(op1));
    $(control).focusout(function() { $(control).val(retrval(control)) })
}

var Tri = function(a,b,c,ab,bc,ca) {
    this.a = a
    this.b = b
    this.c = c
    this.ab = ab;
    this.bc = bc;
    this.ca = ca;
}

Tri.prototype.toString = function() {
    return this.a + "," + this.b + "," + this.c
}


function strokeTri(ctx, t, projection, force) {
    var a = project(t.a, projection)
    var b = project(t.b, projection)
    var c = project(t.c, projection)

    if(force || t.ab) {
        ctx.moveTo(a.x,a.y)
        ctx.lineTo(b.x,b.y)
    }
    if(force || t.bc) {
        if(!t.ab)
            ctx.moveTo(b.x,b.y)
        ctx.lineTo(c.x,c.y)
    }
    if(force || t.ca) {
        if(!t.bc)
            ctx.moveTo(c.x,c.y)
        ctx.lineTo(a.x,a.y)
    }

}

function triTri(t1, t2, debug) {
    if(t1.x2 < t2.x1 || t1.x1 > t2.x2) return null;
    if(t1.y2 < t2.y1 || t1.y1 > t2.y2) return null;
    if(t1.z2 < t2.z1 || t1.z1 > t2.z2) return null;
    //console.log(t2.a,t2.b,t2.c)

    var points = []
    var p

    function collide(t, a, b) {
        if(debug) console.groupCollapsed("colliding " + t + " against " + a + " .. " + b);
        p = triLine(t, a, b, MODE_TRI_LINE, debug)
        if(debug) console.log("collided " + t + " against " + a + " .. " + b);
        if(p) {
            if(debug) console.log("and it is a HIT: " + p);
            points.push(p)
        } else {
            if(debug) console.log("and it is a MISS");
        }
        if(debug) console.groupEnd();
    }

    collide(t1, t2.a, t2.b)
    collide(t1, t2.b, t2.c)
    collide(t1, t2.c, t2.a)
    collide(t2, t1.a, t1.b)
    collide(t2, t1.b, t1.c)
    collide(t2, t1.c, t1.a)

    if(points.length > 1) {
        var max = 0
        var p1,p2

        points.forEach(function(a) {
            points.forEach(function(b) {
                var x = a.x - b.x;
                var y = a.y - b.y;
                var z = a.z - b.z;
                var d = x*x + y*y + z*z

                if(d > max) {
                    p1 = a
                    p2 = b
                    max = d
                }
            });
        });
        if(max > 0) {
            return { a: p1, b: p2 }
        }
    }
    return null
}

function createObject(which) {
    var nseg = 32;
    var tris = []
    var dense = false

    function quad(a,b,c,d,ab,bc,cd,da) {
        tris.push(new Tri(a,b,c,ab,bc,false));
        tris.push(new Tri(a,c,d,false,cd,da));
    }

    switch(which) {
        case "cylinder":
            var v1 = m3d.vector(1,0,-1)
            var c1 = m3d.vector(0,0,-1)
            var v2 = m3d.vector(1,0,1)
            var c2 = m3d.vector(0,0,1)

            for(var i = 0; i <= nseg; ++i) {
                var m1 = m3d.rotate(m3d.vector(0,0,1), 2 * Math.PI * i / nseg)
                var m2 = m3d.rotate(m3d.vector(0,0,1), 2 * Math.PI * (i+1) / nseg)

                var stroke = dense
                if(!stroke) {
                    stroke = (i % (nseg/4)) == 0
                }

                var a = m1.apply(v1)
                var b = m2.apply(v1)
                var c = m2.apply(v2)
                var d = m1.apply(v2)

                quad(a,b,c,d,true,false,true,stroke);

                var t1 = new Tri(
                    c1,
                    a,
                    b,
                    dense,false,false
                );
                var t2 = new Tri(
                    c2,
                    c,
                    d,
                    dense,false,false
                );
                tris.push(t1)
                tris.push(t2)
            }
            break;

        case "cone":
            var v = m3d.vector(1,0,-1)
            var spike = m3d.vector(0,0,1)
            var center = m3d.vector(0,0,-1)

            for(var i = 0; i <= nseg; ++i) {
                var m1 = m3d.rotate(m3d.vector(0,0,1), 2 * Math.PI * i / nseg)
                var m2 = m3d.rotate(m3d.vector(0,0,1), 2 * Math.PI * (i+1) / nseg)

                var a = m1.apply(v)
                var b = m2.apply(v)

                var stroke = dense
                if(!stroke) {
                    stroke = (i % (nseg/4)) == 0
                }

                var t = new Tri(
                    spike,
                    a,
                    b,
                    stroke,true,false
                );
                tris.push(t)
                var t2 = new Tri(
                    center,
                    a,
                    b,
                    dense,false,false
                );
                tris.push(t2)
            }
            break;

        case "sphere":
            var vseg = nseg / 2;
            var V = m3d.vector(0,0,1)
            var axis = m3d.vector(0,1,0);

            for(var i = 0; i <= nseg; ++i) {
                var m1 = m3d.rotate(m3d.vector(0,0,1), 2 * Math.PI * i / nseg)
                var m2 = m3d.rotate(m3d.vector(0,0,1), 2 * Math.PI * (i+1) / nseg)

                var n1 = m3d.rotate(axis, Math.PI/vseg)
                var n2 = m3d.rotate(axis, Math.PI*(vseg-1)/vseg)
                var n3 = m3d.rotate(axis, Math.PI)

                var strokev = dense
                if(!strokev) {
                    strokev = (i % (nseg/4)) == 0
                }

                var t1 = new Tri(
                    V,
                    m3d.mul(n1, m1).apply(V),
                    m3d.mul(n1, m2).apply(V),
                    false,false,strokev
                );
                var t2 = new Tri(
                    m3d.mul(n2, m1).apply(V),
                    m3d.mul(n2, m2).apply(V),
                    m3d.mul(n3, m1).apply(V),
                    dense,strokev,false
                );
                tris.push(t1)
                tris.push(t2)

                for(var j=1;j<vseg-1;++j) {
                    var strokeh = dense
                    if(!strokeh) {
                        strokeh = (j % (vseg/2)) == 0
                    }

                    var n1 = m3d.rotate(axis, Math.PI * j / vseg)
                    var n2 = m3d.rotate(axis, Math.PI * (j+1) / vseg)

                    quad(
                        m3d.mul(n1, m1).apply(V),
                        m3d.mul(n2, m1).apply(V),
                        m3d.mul(n2, m2).apply(V),
                        m3d.mul(n1, m2).apply(V),
                        false,false,strokev,strokeh);
                }
            }
            break;

        case "cube":
            var v1 = m3d.vector(-1,-1,-1);
            var v2 = m3d.vector( 1,-1,-1);
            var v3 = m3d.vector( 1, 1,-1);
            var v4 = m3d.vector(-1, 1,-1);

            var u1 = m3d.vector(-1,-1, 1);
            var u2 = m3d.vector( 1,-1, 1);
            var u3 = m3d.vector( 1, 1, 1);
            var u4 = m3d.vector(-1, 1, 1);

            quad(v1,v2,v3,v4,true,true,true,true);
            quad(u1,u2,u3,u4,true,true,true,true);
            quad(v1,v2,u2,u1,false,true,false,false);
            quad(v2,v3,u3,u2,false,true,false,false);
            quad(v3,v4,u4,u3,false,true,false,false);
            quad(v4,v1,u1,u4,false,true,false,false);
            break;

        default: throw "bad object: " + which;

    }
    return tris;
}

function transformObject(how, tris) {
    var mat1 = m3d.scale(m3d.vector(how.scalex, how.scaley, how.scalez))
    var mat2 = m3d.translate(m3d.vector(how.positionx, how.positiony, how.positionz))

    var xaxis = m3d.vector(1,0,0)
    var yaxis = m3d.vector(0,1,0)
    var zaxis = m3d.vector(0,0,1)

    // https://en.wikipedia.org/wiki/Euler_angles#Tait.E2.80.93Bryan_angles
    var r1 = m3d.rotate(xaxis, how.rotx * Math.PI / 180);
    yaxis = r1.apply(yaxis)
    zaxis = r1.apply(zaxis)
    var r2 = m3d.rotate(yaxis, how.roty * Math.PI / 180);
    zaxis = r2.apply(zaxis)
    var r3 = m3d.rotate(zaxis, how.rotz * Math.PI / 180);

    var mat = m3d.mul(mat1, mat2, r1, r2, r3)

    tris.forEach(function(t) {
        t.a = mat.apply(t.a).norm()
        t.b = mat.apply(t.b).norm()
        t.c = mat.apply(t.c).norm()
        t.x1 = Math.min(t.a.x, t.b.x, t.c.x)
        t.y1 = Math.min(t.a.y, t.b.y, t.c.y)
        t.z1 = Math.min(t.a.z, t.b.z, t.c.z)
        t.x2 = Math.max(t.a.x, t.b.x, t.c.x)
        t.y2 = Math.max(t.a.y, t.b.y, t.c.y)
        t.z2 = Math.max(t.a.z, t.b.z, t.c.z)
    });
}

var MODE_TRI_LINE = 0
var MODE_PLANE_LINE = 1
function triLine(t, l1, l2, mode, debug) {
    if(!mode) mode = MODE_TRI_LINE

    var p1 = t.a
    var p2 = t.b
    var p3 = t.c

    var a1  = l1.x-p1.x
    var a2  = l1.y-p1.y
    var a3  = l1.z-p1.z

    var a11 = p2.x-p1.x
    var a21 = p2.y-p1.y
    var a31 = p2.z-p1.z

    var a12 = p3.x-p1.x
    var a22 = p3.y-p1.y
    var a32 = p3.z-p1.z

    var a13 = l1.x-l2.x
    var a23 = l1.y-l2.y
    var a33 = l1.z-l2.z

    if(debug) {
        var le1 = " Tx = " + l1.x + " - c*" + a13;
        var le2 = " Ty = " + l1.y + " - c*" + a23;
        var le3 = " Tz = " + l1.z + " - c*" + a33;
        var pe1 = " Tx = " + p1.x + " + a*" + a11 + " + b*" + a12;
        var pe2 = " Ty = " + p1.y + " + a*" + a21 + " + b*" + a22;
        var pe3 = " Tz = " + p1.z + " + a*" + a31 + " + b*" + a32;
        console.log("mode: " + mode)
        console.group("line equation:")
        console.log(le1)
        console.log(le2)
        console.log(le3)
        console.groupEnd();
        console.group("plane equation:");
        console.log(pe1)
        console.log(pe2)
        console.log(pe3)
        console.groupEnd();
        console.log("solve([" + le1 + ", " + le2 + ", " + le3 + ", " + pe1 + ", " + pe2 + ", " + pe3 + "], [ Tx,Ty,Tz,a,b,c ])");
        console.group("matrix:");
        console.log(a11 + "*a + " + a12 + "*b + " + a13 + "*c = " + a1)
        console.log(a21 + "*a + " + a22 + "*b + " + a23 + "*c = " + a2)
        console.log(a31 + "*a + " + a32 + "*b + " + a33 + "*c = " + a3)
        console.groupEnd();
    }

    var D = (
            a11*a22*a33 +
            a21*a32*a13 +
            a31*a12*a23 -
            a11*a32*a23 -
            a31*a22*a13 -
            a21*a12*a33)

    if(D > -0.0000000001 && D < 0.0000000001) {
        return null
    }

    function result() {
        var r = m3d.vector(l1.x - c*a13, l1.y - c*a23, l1.z - c*a33)
        if(debug) console.log("==>" , r)
        return r
    }

    var c = ((a21*a32-a22*a31)*a1 + (a12*a31-a11*a32)*a2 + (a11*a22-a12*a21)*a3) / D;
    if(debug) {
        console.log("D = " + D)
        console.log("T: " , t.a, t.b, t.c)
        console.log("L: " , l1, l2)
        console.log("c: ", c)
    }
    if(mode == MODE_PLANE_LINE) {
        if(c >= 0 && c <= 1) return result();
    }

    var b = ((a23*a31-a21*a33)*a1 + (a11*a33-a13*a31)*a2 + (a13*a21-a11*a23)*a3) / D;
    var a = ((a22*a33-a23*a32)*a1 + (a13*a32-a12*a33)*a2 + (a12*a23-a13*a22)*a3) / D;

    if(debug) {
        console.log("b: ", a)
        console.log("a: ", a)
    }
    if(a >= 0 && b >= 0 && a+b <= 1 && c >= 0 && c <= 1) {
        return result();
    } else {
        return null;
    }
}

// werid kind of "cabinet" projection
function cabinet(cx, cy, scalex, scaley) {
    var m = new m3d.Matrix(
                1, 0, 0.5, 0,
                0, 1, 0.5, 0,
                0, 0, 0,   0,
                0, 0, 0,   1
            );
    return createCamera(m, cx, cy, scalex, scaley)
}

function ortho(cx, cy, scalex, scaley) {
    return createCamera(m3d.identity(), cx, cy, scalex, scaley)
}


function describeObject(suffix) {
    return {
        "objtype": $("#objtype"+suffix).val(),
        "rotx": retrval($("#rotx"+suffix)),
        "roty": retrval($("#roty"+suffix)),
        "rotz": retrval($("#rotz"+suffix)),
        "scalex": retrval($("#scalex"+suffix)),
        "scaley": retrval($("#scaley"+suffix)),
        "scalez": retrval($("#scalez"+suffix)),
        "positionx": retrval($("#positionx"+suffix)),
        "positiony": retrval($("#positiony"+suffix)),
        "positionz": retrval($("#positionz"+suffix)),
    };
}

function serializeObjectDescrption(d) {
            return d.objtype + 
                ":" + d.rotx + 
                ":" + d.roty + 
                ":" + d.scalez + 
                ":" + d.rotz + 
                ":" + d.scalex + 
                ":" + d.scaley + 
                ":" + d.positionz + 
                ":" + d.positionx + 
                ":" + d.positiony;
}

function describeCuts() {
    var result = []
    $(".cut").each(function() {
        var axis = $(this).parent().children("select").val()
        var val = retrval($(this));

        result.push({axis: axis, value: val })
    });
    return result
}

function serializeViewDescription(view) {
    var proj;
    switch(view.projection) {
        case ortho: proj = "o"; break;
        default: proj = "c"; break;
    }

    return view.zoom + ":" + view.hRot + ":" + view.vRot + ":" + proj;
}

function serializeCutsDescription(cuts) {
    var result = ""
    var first = true
    cuts.forEach(function(cut) {
        if(first) {
            first = false;
        } else {
            result += ":";
        }
        result += cut.axis + ":" + cut.value;
    });
    return result;
}


var theFirst, theSecond, theIntersection
var theView = {
    setProjection: function(p) {
        this.zoom = 1
        this.hRot = 0
        this.vRot = 0
        this.projection = p
    }
}
theView.setProjection(cabinet)
var theCuts = {
    x: [],
    y: [],
    z: []
}
var theSceneDescription = {
    update: function() {
        this.obj1 = describeObject("_1");
        this.obj2 = describeObject("_2");
        this.cuts = describeCuts();
    }
};

function recalc() {
//    console.group("Recalc");
    theSceneDescription.update();
    var obj1 = theSceneDescription.obj1
    var obj2 = theSceneDescription.obj2
    var cuts = theSceneDescription.cuts
    

//    console.log(obj1);
//    console.log(obj2)

    var tr1 = createObject(obj1.objtype)
    var tr2 = createObject(obj2.objtype)
    var thePermanlinkScene = "xxx";

    transformObject(obj1, tr1)
    transformObject(obj2, tr2)

    var isection = []

    tr1.forEach(function(t1) {
        tr2.forEach(function(t2) {
            var line = triTri(t1, t2)
            if(line) {
                isection.push(line)
            }
        })
    })

    var xcuts = []
    var ycuts = []
    var zcuts = []

    cuts.forEach(function(c) {
        var t, out
        var v = c.value
        switch(c.axis) {
            case "x":
                t = new Tri(m3d.vector(v, 0, 0), m3d.vector(v, 1, 0), m3d.vector(v, 0, 1))
                out = xcuts
                break

            case "y":
                t = new Tri(m3d.vector(0, v, 0), m3d.vector(1, v, 0), m3d.vector(0, v, 1))
                out = ycuts
                break

            case "z":
                t = new Tri(m3d.vector(0, 0, v), m3d.vector(1, 0, v), m3d.vector(0, 1, v))
                out = zcuts
                break
        }
        isection.forEach(function(line) {
            var pt = triLine(t, line.a, line.b, MODE_PLANE_LINE);
            if(pt) {
                out.push(pt)
            }
        });
    });


    theIntersection = isection
    theFirst = tr1
    theSecond = tr2
    theCuts.x = xcuts
    theCuts.y = ycuts
    theCuts.z = zcuts


    redraw()
}

function project(v, matrix) {
    v = matrix.apply(v).norm()
    return m3d.vector(
        Math.round(v.x),
        Math.round(v.y),
        0
    );
}

function createCamera(m,cx,cy,scalex,scaley) {
    var rot = m3d.rotate(m3d.vector(1, 0, 0), -Math.PI/2)
    var disp = new m3d.Matrix(
        scalex, 0, 0, cx,
        0, scaley, 0, cy,
        0, 0, 0, 0,
        0, 0, 0, 1
    );
    return m3d.mul(rot, m, disp);
}


function redraw() {
    var mv = $("#mainview");
    var canvas = $("#canvas");
    var width = mv.width();
    var height = mv.height();
    var textSize = "1em";
    canvas.prop("width", width);
    canvas.prop("height", height);
    var ctx = canvas[0].getContext("2d");

    var axis = m3d.vector(0,0,1)
    var axis2 = m3d.vector(1,0,0)
    var m1 = m3d.rotate(axis, -theView.hRot * Math.PI)
//    axis2 = m1.apply(axis2)
    var m2 = m3d.rotate(axis2, -theView.vRot * Math.PI)
    var m3 = m3d.scale(m3d.vector(theView.zoom, theView.zoom, theView.zoom))
    var scale = Math.min(width, height) / 4;
    var m4 = theView.projection(width/2, height/2, scale, -scale)
    var lineWidth = scale / 150;
    if(lineWidth < 1)
        lineWidth = 1;
    ctx.lineWidth = lineWidth;

    var projection = m3d.mul(m1, m2, m3, m4)

    // we could also use something like
    //    window.location.protocol + window.location.host + window.location.pathname + window.location.search
    // but this one is less error prone and works for file:/// properly 
    var myurl = window.location.href.split("#")[0]
    var str = myurl + 
        "#" + serializeObjectDescrption(theSceneDescription.obj1) + 
        "_" + serializeObjectDescrption(theSceneDescription.obj2) +
        "_" + serializeCutsDescription(theSceneDescription.cuts) +
        "_" + serializeViewDescription(theView);

    $("#permalink").attr("href", str);
    $("#permalink").text(str);

    ctx.beginPath();
    theFirst.forEach(function(t) {
        strokeTri(ctx, t, projection)
    });
    ctx.strokeStyle = "#602000";
    ctx.stroke();

    ctx.beginPath();
    theSecond.forEach(function(t) {
        strokeTri(ctx, t, projection)
    });
    ctx.strokeStyle = "#002080";
    ctx.stroke();

    ctx.strokeStyle =  "#888888"
    ctx.beginPath();
    theIntersection.forEach(function(line) {
        var a = project(line.a, projection)
        var b = project(line.b, projection)
        ctx.moveTo(a.x+2,a.y)
        ctx.lineTo(b.x+2,b.y)
    });
    ctx.stroke();

    function drawCuts(cuts) {
        cuts.forEach(function(c) {
            var p = project(c, projection)
            var w = lineWidth * 2;

            ctx.moveTo(p.x-w,p.y-w);
            ctx.lineTo(p.x+w,p.y+w);
            ctx.moveTo(p.x+w,p.y-w);
            ctx.lineTo(p.x-w,p.y+w);

            var str = "(" + roundTo(c.x,3) + ", " + roundTo(c.y,3) + ", " + roundTo(c.z,3) + ")";

            ctx.fillText(str, p.x+w, p.y); 
        });
    }
    ctx.textBaseline = "hanging"
    ctx.font = Math.round(lineWidth*7) + "px sans-serif"

    ctx.fillStyle   = "#FFA0A0"
    ctx.strokeStyle = "#FFA0A0"
    ctx.beginPath();
    drawCuts(theCuts.x);
    ctx.stroke();

    ctx.fillStyle   = "#A0FFA0"
    ctx.strokeStyle = "#A0FFA0"
    ctx.beginPath();
    drawCuts(theCuts.y);
    ctx.stroke();

    ctx.fillStyle   = "#A0A0FF"
    ctx.strokeStyle = "#A0A0FF"
    ctx.beginPath();
    drawCuts(theCuts.z);
    ctx.stroke();

//    console.log("Done painting");
}

function addCut(val) {
    // this one does NOT recalculate stuff
    var input = $("<input type='text' class='cut'/>");
    input.val(val)
    var div = $("<div></div>")
    var select = $(
        "<select>"+
        "<option value='x'>X</option><option value='y'>Y</option><option value='z'>Z</option>"+
        "</select>")
    select.change(scheduleRecalc)
       
    div.append(select)
    div.append(input)

    setupButtons(input,
        "+0.1", function(v) { return (Math.round(v*10)+1)/10 },
        "-0.1", function(v) { return (Math.round(v*10)-1)/10 },
        "+1", function(v) { return Math.round(v*10)/10+1 },
        "-1", function(v) { return Math.round(v*10)/10-1 },
        function() { div.remove(); scheduleRecalc(); })

    $("#cutsFieldsset").append(div);
}

var scheduleHandle = undefined;
function schedule(what, when) {
//    console.log("schedule update")
    if(scheduleHandle !== undefined) {
        window.clearTimeout(scheduleHandle);
    }
    scheduleHandle = window.setTimeout(function() {
        scheduleHandle = undefined;
        what();
    }, when);
}
var scheduleRecalc = function() { schedule(recalc, 300); }
var scheduleRedraw = function() { schedule(redraw, 10); }

$(document).ready(function() {
    $(".objtype").change(scheduleRecalc)
    $(".rotation").each(function() {
        setupButtons(this,
            "+2", function(v) { return v+2 },
            "-2", function(v) { return v-2 },
            "+45", function(v) { return v+45 },
            "-45", function(v) { return v-45 });
    });
    $(".scale").each(function() {
        setupButtons(this,
            "+0.1", function(v) { return (Math.round(v*10)+1)/10 },
            "-0.1", function(v) { return (Math.round(v*10)-1)/10 },
            "*2", function(v) { return v*2 },
            "/2", function(v) { return v/2 });
    });
    $(".position").each(function() {
        setupButtons(this,
            "+0.1", function(v) { return (Math.round(v*10)+1)/10 },
            "-0.1", function(v) { return (Math.round(v*10)-1)/10 },
            "+1", function(v) { return Math.round(v*10)/10+1 },
            "-1", function(v) { return Math.round(v*10)/10-1 });
    });
    $("#addcut").on("click", function() { addCut(); scheduleRecalc(); } );
    $("#orthoview").on("click", function() { theView.setProjection(ortho); scheduleRedraw(); } )
    $("#cabinetview").on("click", function() { theView.setProjection(cabinet); scheduleRedraw(); } )
    $("#canvas").on("wheel", function(e) {
        var amt;
        var delta = e.originalEvent.deltaY;
        switch(e.originalEvent.deltaMode) {
            case WheelEvent.DOM_DELTA_LINE:  amt = 0.05 * delta; break;
            case WheelEvent.DOM_DELTA_PIXEL: amt = delta * 2 / $(this).height(); break;
            case WheelEvent.DOM_DELTA_PAGE:  amt = 0.3 * delta; break;
        }
        e.preventDefault();
        theView.zoom -= amt;
        if(theView.zoom < 0.2) theView.zoom = 0.2;
        scheduleRedraw();
    })
    .mousedown(function(e) {
        var lastX = e.pageX
        var lastY = e.pageY
        if(e.which == 1) {
            $(this).mousemove(function(e) {
                var dx = lastX - e.pageX
                var dy = lastY - e.pageY
                var min = Math.min($(this).width(), $(this).height())
                function clamp(what) {
                    while(what > 1.0) what -= 1.0;
                    while(what < -1.0) what += 1.0;
                    return what;
                }
                theView.hRot += clamp(dx / min)
                theView.vRot += clamp(dy / min)

                scheduleRedraw()

                lastX = e.pageX
                lastY = e.pageY
            })
        }
    });
    // <https://api.jquery.com/mousemove/>
    //  "remember that the mouseup event might be sent to a different HTML element 
    //   than the mousemove event was. To account for this, the mouseup handler should 
    //   typically be bound to an element high up in the DOM tree, such as <body>"
    $("body").mouseup(function(e) {
        $("#canvas").off("mousemove")
    });
    console.log(window.location.hash)

    $(window).resize(scheduleRedraw);
    scheduleRecalc();
});
