// Realtime WebGL globe
// Copyright (c) 2015 Mike van Rossum
//
// Realtime Globe is a WebGL based earth globe that
// makes it super simple to add shapes in realtime
// on specific lat/lon positions on earth.
//
// @param container DOM Node div
// @param urls Object URLs of images
//  {
//    earth: String URL
//    bump: Sting URL [optional]
//    specular: String URL [optional]
//  }
var Globe = function(container, urls) {
    var animationFrameId;
    //OPTION TOGGLES
    var SPIN_GLOBE = true;
    var totalBlocksOnGlobe;

    //MATH
    var PI = Math.PI;
    var PI_HALF = PI / 2;

    // Three.js objects
    var camera;
    var scene;
    var light;
    var renderer;

    var earth;
    var earthGeometry;
    var earthPosition;

    // camera's distance from center (and thus the globe)
    var distanceTarget = 900;
    var distance = distanceTarget;

    // camera's position
    var rotation = {
        x: 2,
        y: 1
    };
    var target = {
        x: 2,
        y: 1
    };
    //  var rotation = { x: 0, y: 0 };
    //  var target = { x: Math.PI*1.7, y: Math.PI / 5.0 };

    // holds currently levitating blocks
    var levitatingBlocks = [];
    // holds all block references
    //var blocks = [];

    var blocks = {};

    // What gets exposed by calling:
    //
    //    var globe = [new] Globe(div, urls);
    //
    // attach public functions to this object
    var api = {};


    // Spawns the globe
    api.init = function() {
        setSize();
        totalBlocksOnGlobe = 0;

        // Camera
        camera = new THREE.PerspectiveCamera(30, w / h, 1, 1500);
        camera.position.z = distance;

        // Scene
        scene = new THREE.Scene();

        // Earth geom, used for earth & atmosphere
        earthGeometry = new THREE.SphereGeometry(200, 64, 64);

        // Light, reposition close to camera
        light = createMesh.directionalLight();

        // we use this to correctly position camera and blocks
        earth = createMesh.earth(urls);
        earthPosition = earth.position;

        // Add meshes to scene
        scene.add(earth);



        //scene.remove(earth);
        scene.add(createMesh.atmosphere());

        // Add lights to scene
        scene.add(new THREE.AmbientLight(0x656565));
         //scene.add(light);

        var geometry  = new THREE.SphereGeometry(600, 64, 64) ;

        var material  = new THREE.MeshBasicMaterial();
        material.map   = THREE.ImageUtils.loadTexture('./img/galaxy_starfield.png');
        material.side  = THREE.BackSide;



        var mesh  = new THREE.Mesh(geometry, material)  ;
        scene.add(mesh)

        //
        // Renderer
        renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        renderer.setSize(w, h);



        // Add scene to DOM
        renderer.domElement.style.position = 'absolute';
        container.appendChild(renderer.domElement);

        // DOM event handlers
        container.addEventListener('mousedown', handle.drag.start, false);
        window.addEventListener('resize', handle.resize, false);

        // Scroll for Chrome
        window.addEventListener('mousewheel', handle.scroll, false);
        // Scroll for Firefox
        window.addEventListener('DOMMouseScroll', handle.scroll, false);

        // Bootstrap render
        animate();

        return this;
    }

    api.changeGlobeImage = function(urls){
        // we use this to correctly position camera and blocks
        earthPosition = earth.position;
        scene.remove(earth);

        earth = createMesh.earth(urls);
        earth.position = earthPosition;
        // Add meshes to scene
        scene.add(earth);

    }

    api.stopAnimation = function(){
        cancelAnimationFrame( animationFrameId );

    }

    var setSize = function() {
        w = container.offsetWidth || window.innerWidth;
        h = container.offsetHeight || window.innerHeight;
    }

    var createMesh = {

        // @param urls Object URLs of images
        //
        //  {
        //    earth: String URL
        //    bump: Sting URL [optional]
        //    specular: String URL [optional]
        //  }
        //
        // See
        // @link http://learningthreejs.com/blog/2013/09/16/how-to-make-the-earth-in-webgl/
        // @link http://learningthreejs.com/data/2013-09-16-how-to-make-the-earth-in-webgl/demo/index.html
        earth: function(urls) {
            //if (!urls.earth)
            //    throw 'No image URL provided for an earth image';
            //
            //var material = new THREE.MeshPhongMaterial();
            //material.map = THREE.ImageUtils.loadTexture(urls.earth);
            //
            //if (urls.bump) {
            //    material.bump = THREE.ImageUtils.loadTexture(urls.bump);
            //    material.bumpScale = 0.02;
            //}
            //
            //if (urls.specular) {
            //    material.specularMap = THREE.ImageUtils.loadTexture(urls.specular);
            //    material.specular = new THREE.Color('grey');
            //}

            var shader = {
                uniforms: {
                    'texture': { type: 't', value: null }
                },
                vertexShader: [
                    'varying vec3 vNormal;',
                    'varying vec2 vUv;',
                    'void main() {',
                    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
                    'vNormal = normalize( normalMatrix * normal );',
                    'vUv = uv;',
                    '}'
                ].join('\n'),
                fragmentShader: [
                    'uniform sampler2D texture;',
                    'varying vec3 vNormal;',
                    'varying vec2 vUv;',
                    'void main() {',
                    'vec3 diffuse = texture2D( texture, vUv ).xyz;',
                    'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
                    'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
                    'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
                    '}'
                ].join('\n')
            };

            var uniforms = THREE.UniformsUtils.clone(shader.uniforms);
            uniforms['texture'].value = THREE.ImageUtils.loadTexture(urls.earth);

            var material = new THREE.ShaderMaterial({

                uniforms: uniforms,
                vertexShader: shader.vertexShader,
                fragmentShader: shader.fragmentShader

            });


            return new THREE.Mesh(earthGeometry, material);
        },

        // See
        // @link https://github.com/dataarts/webgl-globe/blob/master/globe/globe.js#L52
        // @link http://bkcore.com/blog/3d/webgl-three-js-animated-selective-glow.html
        //
        // Currently has some issues, especially when zooming out (distance > 900)
        atmosphere: function() {
            var material = new THREE.ShaderMaterial({
                vertexShader: [
                    'varying vec3 vNormal;',
                    'void main() {',
                    'vNormal = normalize( normalMatrix * normal );',
                    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
                    '}'
                ].join('\n'),
                fragmentShader: [
                    'varying vec3 vNormal;',
                    'void main() {',
                    'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
                    'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
                    '}'
                ].join('\n'),
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
                transparent: true
            });

            var mesh = new THREE.Mesh(earthGeometry, material);
            mesh.scale.set(1.1, 1.1, 1.1);
            return mesh;
        },

        directionalLight: function() {
            return new THREE.DirectionalLight(0xcccccc, 0.5);
        },


        block: function(color) {

            return new THREE.Mesh(
                //new THREE.BoxGeometry(1, 1, 1),
                new THREE.BoxGeometry(0.05, 0.05, 1),

                //new THREE.MeshLambertMaterial({color: color})
                //  new THREE.MeshBasicMaterial({color: color})
                new THREE.MeshBasicMaterial({
                    color: color
                })


            );
        }

    }

    // Keep track of mouse positions
    var mouse = {
        x: 0,
        y: 0
    };
    var mouseOnDown = {
        x: 0,
        y: 0
    };
    var targetOnDown = {
        x: 0,
        y: 0
    };

    // DOM event handlers
    var handle = {
        scroll: function(e) {
            e.preventDefault();

            // See
            // @link http://www.h3xed.com/programming/javascript-mouse-scroll-wheel-events-in-firefox-and-chrome
            if (e.wheelDelta) {
                // chrome
                var delta = e.wheelDelta * 0.5;
            } else {
                // firefox
                var delta = -e.detail * 15;
            }

            api.zoomRelative(delta);

            return false;
        },

        resize: function(e) {
            setSize();
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        },

        // See
        // @link https://github.com/dataarts/webgl-globe/blob/master/globe/globe.js#L273-L334
        drag: {
            start: function(e) {
                e.preventDefault();
                container.addEventListener('mousemove', handle.drag.move, false);
                container.addEventListener('mouseup', handle.drag.end, false);
                container.addEventListener('mouseout', handle.drag.end, false);

                mouseOnDown.x = -e.clientX;
                mouseOnDown.y = e.clientY;

                targetOnDown.x = target.x;
                targetOnDown.y = target.y;

                container.style.cursor = 'move';
            },
            move: function(e) {
                mouse.x = -e.clientX;
                mouse.y = e.clientY;

                var zoomDamp = distance / 1000;

                target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
                target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

                target.y = target.y > PI_HALF ? PI_HALF : target.y;
                target.y = target.y < -PI_HALF ? -PI_HALF : target.y;
            },
            end: function(e) {
                container.removeEventListener('mousemove', handle.drag.move, false);
                container.removeEventListener('mouseup', handle.drag.end, false);
                container.removeEventListener('mouseout', handle.drag.end, false);
                container.style.cursor = 'auto';
            }
        }
    }

    var checkAltituteBoundries = function() {
        // max zoom
        if (distanceTarget < 300)
            distanceTarget = 300;

        // min zoom
        else if (distanceTarget > 900)
            distanceTarget = 900;
    }

    var animate = function() {
        animationFrameId = requestAnimationFrame(animate);
        render();
    }

    var render = function() {
        levitateBlocks();

        if (SPIN_GLOBE) {
            //target.x -= 0.003;
            //target.y -= 0.003;

            target.x -= 0.003;
            rotation.x += (target.x - rotation.x) * 0.2;
            target.y = Math.PI / 5.0;
        }

        // Rotate towards the target
        rotation.x += (target.x - rotation.x) * 0.1;
        rotation.y += (target.y - rotation.y) * 0.1;
        distance += (distanceTarget - distance) * 0.3;

        // determine camera position
        set3dPosition(camera, {
            x: rotation.x,
            y: rotation.y,
            altitude: distance
        });

        // Determine light position based
        set3dPosition(light, {
            x: rotation.x - 150,
            y: rotation.y - 150,
            altitude: distance
        });

        camera.lookAt(earthPosition);
        renderer.render(scene, camera);
    }

    // @param Object position (2d lat/lon coordinates)
    // @return Object coords (x/y coordinates)
    //
    // Calculates x, y coordinates based on
    // lat/lon coordinates.
    var calculate2dPosition = function(coords) {
        var phi = (90 + coords.lon) * PI / 180;
        var theta = (180 - coords.lat) * PI / 180;

        return {
            x: phi,
            y: PI - theta
        }
    }

    // @param Mesh object
    // @param Object coords (x/y coordinates in 2d space + altitute)
    //
    // Calculates 3d position and sets it on mesh
    var set3dPosition = function(mesh, coords) {
        if (!coords)
            coords = mesh.userData;

        var x = coords.x;
        var y = coords.y;
        var altitude = coords.altitude;

        mesh.position.set(
            altitude * Math.sin(x) * Math.cos(y),
            altitude * Math.sin(y),
            altitude * Math.cos(x) * Math.cos(y)
        );
    }

    // Create a block mesh and set its position in 3d
    // space just below the earths surface
    var createLevitatingBlock = function(properties) {
        // create mesh
        var block = createMesh.block(properties.color);

        // calculate 2d position
        var pos2d = calculate2dPosition(properties);

        block.userData = {
            // set 2d position on earth so we can more
            // easily recalculate the 3d position

            x: pos2d.x,
            y: pos2d.y,


            altitude: 200 - properties.size / 1.5,
            //altitude:  200 + userData.size / 2,
            targetAltitude: 205 - properties.size / 1.5,

            // speed at which block levitates outside
            // earth's core
            levitation: .1,

            size: properties.size
        }

        // calculate 3d position
        set3dPosition(block);

        // rotate towards earth
        block.lookAt(earthPosition);

        block.scale.z = properties.size;
        block.scale.x = properties.size;
        block.scale.y = properties.size;

        block.updateMatrix();

        return block;
    }

    // Create a block mesh and set its position in 3d
    // space just below the earths surface
    var createBlock = function(properties) {
        // create mesh
        var block = createMesh.block(properties.color);

        // calculate 2d position
        var pos2d = calculate2dPosition(properties);

        // add altitute
        pos2d.altitude = 200 + properties.size / 2;

        // calculate 3d position
        set3dPosition(block, pos2d);

        // rotate towards earth
        block.lookAt(earthPosition);

        block.scale.z = properties.size;
        block.scale.x = properties.size;
        block.scale.y = properties.size;

        block.updateMatrix();

        return block;
    }

    // internal function to levitate all levitating
    // blocks each tick. Called on render.
    var levitateBlocks = function() {
        levitatingBlocks.forEach(function(block, i) {

            var userData = block.userData;

            if (!userData){
                console.log(block)
                debugger;
            }

            // if entirely outide of earth, stop levitating
            if (userData.altitude > userData.targetAltitude || userData.altitude > 200 + userData.size / 2) {
                levitatingBlocks.splice(i, 1);
                //scene.remove(block)
                return;
            }

            userData.altitude += userData.levitation;
            set3dPosition(block);
            block.updateMatrix();
        });
    }

    var periodicReducer = function() {
        setInterval(function() {
            if (totalBlocksOnGlobe > 500){
                console.log("Reducing, there are currently "+ totalBlocksOnGlobe+" blocks on globe.")
                for (var key in blocks){
                    var block = blocks[key];
                    var userData = block.userData;

                    //block has lowered past starting
                    if (userData.altitude < 200 - userData.size / 1.5)   {
                        scene.remove(blocks[key]);
                        delete blocks[key];
                        totalBlocksOnGlobe--;
                        console.log("Removing block. Now " + totalBlocksOnGlobe +" blocks on globe.")

                        //return;
                    }
                    else{
                        userData.altitude -= 1;
                        userData.targetAltitude -= 1;
                        set3dPosition(block);
                        block.updateMatrix();
                    }

                    //block.material.color.set('#'+Math.floor(Math.random()*16777215).toString(16))
                }

            }
            else{
                console.log("Not reducing, only "+ totalBlocksOnGlobe+" blocks on globe right now.")
            }

        }, 60000);

    };
    periodicReducer();

    var hashCoordinate = function(lat,lng) {
        return lat + " " + lng;

    };

    //        Public functions


    // @param int delta
    //
    // Zoom the earth relatively to its current zoom.
    // (passing a positive number will zoom towards
    // the earth, while a negative number will zoom
    // away from earth)
    api.zoomRelative = function(delta) {
        distanceTarget -= delta;
        checkAltituteBoundries();

        return this;
    }

    // @param int altitute
    //
    // Transition the altitute of the camera to a specific
    // distance from the earth's core.
    api.zoomTo = function(altitute) {
        distanceTarget = altitute;
        checkAltituteBoundries();

        return this;
    }

    // @param int altitute
    //
    // Set the altitute of the camera to a specific
    // distance from the earth's core.
    api.zoomImmediatelyTo = function(altitute) {
        distanceTarget = distance = altitute;
        checkAltituteBoundries();

        return this;
    }


    // @param Object coordinates

    //  {
    //    lat: (Float) latitute position,
    //    lon: (Float) longtitute position
    //  }

    // Transition the globe from its current position
    // to the new coordinates.
    api.center = function(pos) {
        target = calculate2dPosition(pos);
        return this;
    }

    // @param Object coordinates
    //
    //  {
    //    lat: (Float) latitute position,
    //    lon: (Float) longtitute position
    //  }
    //
    // Center the globe on the new coordinates.
    api.centerImmediate = function(pos) {
        target = rotation = calculate2dPosition(pos);
        return this;
    }

    // @param Object data
    //
    //  {
    //    lat: (Float) latitute position,
    //    lon: (Float) longtitute position,
    //    size: (Float) size of block,
    //    color: (String) color of block
    //  }
    //
    //  Adds a block to the globe. The globe will spawn
    //  just below the earth's surface and `levitate`
    //  out of the surface until it is fully `out` of the
    //  earth.
    api.addLevitatingBlock = function(data) {
        var block = createLevitatingBlock(data);

        scene.add(block);
        levitatingBlocks.push(block); //add to levitation

        //blocks.push(block);                  // add to blocks
        blocks.insert({
            lat: data.lat,
            lng: data.lng,
            data: block
        });

        //for a block in levitating
        // need to remove him from blocks

        return this;
    }

    api.addDynamicBlock = function(data) {
        var block = createLevitatingBlock(data);

        //scene.add(block);
        //blocks.push(block);

        var key = hashCoordinate(data.lat, data.lon);
        var preExistingDataAtLocation = blocks[key];

        //console.log(key,preExistingDataAtLocation)

        if (preExistingDataAtLocation) {
            console.log("INSIDE")
            var oldBlock = preExistingDataAtLocation;
            var userData = oldBlock.userData;
            // Increase target altitude
            userData.targetAltitude = userData.targetAltitude + 1;

            // If block elevation is already in progress, do nothing
            if (levitatingBlocks.indexOf(oldBlock) != -1) {

            } else {
                // If the block is not currently rising, give it to levitatingBlocks
                //console.log(preExistingDataAtLocation)
                levitatingBlocks.push(oldBlock); //add to levitation
            }


        } else {
            blocks[key] = block;
            levitatingBlocks.push(block);
            scene.add(block);
            totalBlocksOnGlobe++;
        }

        return this;
    }

    // @param Object data
    //
    //  {
    //    lat: (Float) latitute position,
    //    lon: (Float) longtitute position,
    //    size: (Float) size of block,
    //    color: (String) color of block
    //  }
    //
    //  Adds a block to the globe.
    api.addBlock = function(data) {
        var block = createBlock(data);

        scene.add(block);
        //blocks.push(block);

        var preExistingDataAtLocation = blocks.find({
            lat: data.lat,
            lng: data.lon
        })

        if (preExistingDataAtLocation.length != 0) {
            console.log(preExistingDataAtLocation)
            //levitatingBlocks.push(preExistingDataAtLocation);        //add to levitation

        } else {
            blocks.insert({
                lat: data.lat,
                lng: data.lon,
                data: block
            });
        }

        return this;
    }

    // Remove all blocks from the globe.
    api.removeAllBlocks = function() {
        for (var key in blocks){
            var block = blocks[key];
            console.log(block);
            scene.remove(block);

        }


        blocks = {}

        return this;
    }


    return api;
}