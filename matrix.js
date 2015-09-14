"use strict";

var m3d = (function() {
    function toNumber(val, def) {
        if(typeof val === "undefined") {
            val = def;
        }
        var x = Number(val)
        if(isNaN(x) || !isFinite(x)) throw "not a number: " + val;
        return x;
    }

    var Vector = function(x,y,z,w) {
        this.x = x;
        this.y = y;
        this.z = z;
        if(typeof w === "undefined")
            w = 1;

        this.w = w;

    }

    Vector.prototype.toString = function() { return "(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")"; }

    Vector.prototype.norm = function() {
        return new Vector(
            this.x / this.w,
            this.y / this.w,
            this.z / this.w,
            1
        );
    }

    var Matrix = function(
            m00,m01,m02,m03,
            m10,m11,m12,m13,
            m20,m21,m22,m23,
            m30,m31,m32,m33)
    {
        this.m00 = m00; this.m01 = m01;this.m02 = m02;this.m03 = m03;
        this.m10 = m10; this.m11 = m11;this.m12 = m12;this.m13 = m13;
        this.m20 = m20; this.m21 = m21;this.m22 = m22;this.m23 = m23;
        this.m30 = m30; this.m31 = m31;this.m32 = m32;this.m33 = m33;

    }

    Matrix.prototype.apply = function(p) {
        var a = this
        return new Vector(
            a.m00*p.x + a.m01*p.y + a.m02*p.z + a.m03*p.w,
            a.m10*p.x + a.m11*p.y + a.m12*p.z + a.m13*p.w,  
            a.m20*p.x + a.m21*p.y + a.m22*p.z + a.m23*p.w,   
            a.m30*p.x + a.m31*p.y + a.m32*p.z + a.m33*p.w
        );
    }

    var mul = function() {
        var a = arguments[0];
        for(var i = 1; i <arguments.length; ++i) {
            var b = arguments[i];

            a = new Matrix(
                a.m00*b.m00 + a.m10*b.m01 + a.m20*b.m02 + a.m30*b.m03, 
                a.m01*b.m00 + a.m11*b.m01 + a.m21*b.m02 + a.m31*b.m03, 
                a.m02*b.m00 + a.m12*b.m01 + a.m22*b.m02 + a.m32*b.m03,    
                a.m03*b.m00 + a.m13*b.m01 + a.m23*b.m02 + a.m33*b.m03, 
                                                                
                a.m00*b.m10 + a.m10*b.m11 + a.m20*b.m12 + a.m30*b.m13,   
                a.m01*b.m10 + a.m11*b.m11 + a.m21*b.m12 + a.m31*b.m13,    
                a.m02*b.m10 + a.m12*b.m11 + a.m22*b.m12 + a.m32*b.m13,    
                a.m03*b.m10 + a.m13*b.m11 + a.m23*b.m12 + a.m33*b.m13, 
                                                                
                a.m00*b.m20 + a.m10*b.m21 + a.m20*b.m22 + a.m30*b.m23,    
                a.m01*b.m20 + a.m11*b.m21 + a.m21*b.m22 + a.m31*b.m23,    
                a.m02*b.m20 + a.m12*b.m21 + a.m22*b.m22 + a.m32*b.m23,    
                a.m03*b.m20 + a.m13*b.m21 + a.m23*b.m22 + a.m33*b.m23, 
                                                                
                a.m00*b.m30 + a.m10*b.m31 + a.m20*b.m32 + a.m30*b.m33,   
                a.m01*b.m30 + a.m11*b.m31 + a.m21*b.m32 + a.m31*b.m33,    
                a.m02*b.m30 + a.m12*b.m31 + a.m22*b.m32 + a.m32*b.m33,    
                a.m03*b.m30 + a.m13*b.m31 + a.m23*b.m32 + a.m33*b.m33 
            );
        }
        return a;
    }


    Matrix.prototype.toString = function() { 
        return "(" + 
            this.m00 + ", " + this.m01 + ", " + this.m02 + ", " + this.m03 + "|" +
            this.m10 + ", " + this.m11 + ", " + this.m12 + ", " + this.m13 + "|" +
            this.m20 + ", " + this.m21 + ", " + this.m22 + ", " + this.m23 + "|" +
            this.m30 + ", " + this.m31 + ", " + this.m32 + ", " + this.m33 + ")";
    }

    var identity = function() {
        return new Matrix(
            1,0,0,0,
            0,1,0,0,
            0,0,1,0,
            0,0,0,1);
    }

    var vector = function(x,y,z,w) { return new Vector(x,y,z,w); }

    var translate = function(v) {
        return new Matrix(
            v.w,0,0,v.x,
            0,v.w,0,v.y,
            0,0,v.w,v.z,
            0,0,0,v.w);
    }

    function rnd(x) {
        return Math.round(x * 1e14) / 1e14;
    }

    var rotate = function(v, a) {
        var s = rnd(Math.sin(a))
        var c = rnd(Math.cos(a))
        var l = v.x/v.w
        var m = v.y/v.w
        var n = v.z/v.w
        return new Matrix(
            l*l*(1-c)+  c, m*l*(1-c)-n*s, n*l*(1-c)+m*s, 0,
            l*m*(1-c)+n*s, m*m*(1-c)+  c, n*m*(1-c)-l*s, 0,
            l*n*(1-c)-m*s, m*n*(1-c)+l*s, n*n*(1-c)+  c, 0,
            0,0,0,1
        );
    }

    var scale = function(v) {
        return new Matrix(
            v.x,0,0,0,
            0,v.y,0,0,
            0,0,v.z,0,
            0,0,0,v.w
        );
    }

    return {
        mul: mul,
        vector: vector,
        identity: identity,
        rotate: rotate,
        scale: scale,
        translate: translate,
        Matrix: Matrix
    }
})();
/*
var p = m3d.vector(5,0,3);
var axis = m3d.vector(0,0,2,2);
var rot = m3d.rotate(axis, Math.PI/2);
var scale = m3d.scale(m3d.vector(1,1,1,0.5));
var tr = m3d.translate(m3d.vector(1,2,3,0.5));
var m = m3d.mul(tr,tr,rot,m3d.identity())
console.log(m + ":" + p + ".." + m.apply(p).norm())*/
