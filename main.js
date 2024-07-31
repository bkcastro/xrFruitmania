
import * as THREE from 'three';
import { BoxLineGeometry } from 'three/addons/geometries/BoxLineGeometry.js';
import { XRButton } from 'three/addons/webxr/XRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AxesHelper } from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';

// Create a Stats object
const stats = new Stats();

// Add the stats panel to the document
document.body.appendChild(stats.dom);

let camera, scene, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

// Physics
let world, RAPIER, eventQueue;
const handleToMesh = new Map();

// gameHook 
let lines = [];

let rigidBodies = [];
let objects = [];

let room, spheres, physics;
const velocity = new THREE.Vector3();

let gameCount = 0;

let count = 0;

// functions don't need to return anything just keep stuff within scope of operations. 

const colors = ['white', 'black', 'red', 'green', 'blue', 'orange', 'purple']
const groups = [0x000D0004, 0x000D0005, 0x000D0006, 0x000D0007, 0x000D0008, 0x100D0009, 0x100D0029]

function spawnBallRandom() {

  if (scene.children.length > 50) return;
  let level = Math.floor(Math.random() * groups.length);
  const group = groups[level];
  const size = .5 + (level / 4);
  const ballGeometry = new THREE.SphereGeometry(size, 32, 32);
  const ballMaterial = new THREE.MeshBasicMaterial({ color: colors[level] });
  const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
  ballMesh.userData.group = group;
  ballMesh.userData.level = level;
  ballMesh.userData.type = colors[level]
  const x = Math.random() * 10 - 5;
  const z = Math.random() * 10 - 5;
  const y = 20;

  ballMesh.position.set(x, y, z);
  scene.add(ballMesh);

  // Add physics
  const ballBody = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z));
  const collider = world.createCollider(RAPIER.ColliderDesc.ball(size).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), ballBody);

  collider.setCollisionGroups(group);
  collider.setSolverGroups(group);

  ballMesh.userData.rigidBody = ballBody;
  ballMesh.userData.collider = collider;

  handleToMesh.set(ballBody.handle, ballMesh);
}

function spawnBall(level = 0, middlePosition = null) {

  const group = groups[level];
  const size = .5 + (level / 4);
  const ballGeometry = new THREE.SphereGeometry(size, 32, 32);
  const ballMaterial = new THREE.MeshBasicMaterial({ color: colors[level] });
  const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
  ballMesh.userData.group = group;
  ballMesh.userData.level = level;
  ballMesh.userData.type = colors[level]

  const newPosition = new THREE.Vector3();

  if (middlePosition == null) {
    newPosition.x = Math.random() * 10 - 5;
    newPosition.z = Math.random() * 10 - 5;
    newPosition.y = 20;
  } else {
    newPosition.copy(middlePosition);
  }

  ballMesh.position.copy(middlePosition);
  scene.add(ballMesh);

  // Add physics
  const ballBody = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(newPosition.x, newPosition.y, newPosition.z));
  const collider = world.createCollider(RAPIER.ColliderDesc.ball(size).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), ballBody);

  collider.setCollisionGroups(group);
  collider.setSolverGroups(group);

  ballMesh.userData.rigidBody = ballBody;
  ballMesh.userData.collider = collider;

  handleToMesh.set(ballBody.handle, ballMesh);
}

function processGameCount(type) {
  gameCount += type + 1;
  console.log(gameCount)
}

function processEvents(eventQueue) {
  const objectsSeen = new Set();
  const objectsToSpawn = [];

  eventQueue.drainCollisionEvents((handle1, handle2, started) => {
    if (started) {
      const a = handleToMesh.get(handle1);
      const b = handleToMesh.get(handle2);

      if (!a || !b) {
        console.warn('Collision detected for unknown object');
        return;
      }

      if (a.userData.type === b.userData.type) {

        if (!objectsSeen.has(a) && !objectsSeen.has(b)) {

          objectsSeen.add(a);
          objectsSeen.add(b);

          // fuck it why not futures of javascript 
          a.userData.handle = handle1;
          b.userData.handle = handle2;

          const middlePoint = new THREE.Vector3();
          middlePoint.addVectors(a.position, b.position).multiplyScalar(0.5);
          console.log(middlePoint)
          objectsToSpawn.push({ level: a.userData.level, position: middlePoint })
        }
      }
    }
  });

  // Process removals outside of the collision event loop
  objectsSeen.forEach((mesh) => {
    world.removeCollider(mesh.userData.collider);
    world.removeRigidBody(mesh.userData.rigidBody);
    handleToMesh.delete(mesh.userData.handle);
    scene.remove(mesh);
  });

  // Spawn new objects
  objectsToSpawn.forEach(({ level, position }) => {
    spawnBall(level, position);
  });

}

function createLineWithJoints(world, startPosition, segmentLength, numSegments) {
  const bodies = [];
  const joints = [];

  // Create rigid bodies and Three.js lines
  for (let i = 0; i < numSegments; i++) {
    const position = {
      x: startPosition.x + i * segmentLength,
      y: startPosition.y,
      z: startPosition.z
    };

    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z);
    const rigidBody = world.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(segmentLength / 2, 0.1, 0.1);
    world.createCollider(colliderDesc, rigidBody);

    bodies.push(rigidBody);

    // Create Three.js line
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(segmentLength, 0, 0)
    ]);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    lines.push(line);
  }

  // Create joints
  for (let i = 0; i < numSegments - 1; i++) {
    const bodyA = bodies[i];
    const bodyB = bodies[i + 1];

    const jointParams = RAPIER.JointData.spherical()
      .localAnchor1(segmentLength / 2, 0, 0)
      .localAnchor2(-segmentLength / 2, 0, 0);

    const joint = world.createImpulseJoint(jointParams, bodyA, bodyB);
    joints.push(joint);
  }

  return { bodies, joints };
}

function makeBoard() {
  const groundGeometry = new THREE.PlaneGeometry(20, 20);  // Increased size for better area coverage
  const groundMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.set(0, 0, 0);  // Centered at origin for easier boundary calculations
  scene.add(groundMesh);

  // Add physics for the ground
  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0, 10), groundBody);

  // Create walls
  const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: true });
  const wallThickness = 0.2;
  const wallHeight = 10;
  const wallPositions = [
    { x: 0, y: wallHeight / 2, z: 10 / 2 }, // North wall
    { x: 10 / 2, y: wallHeight / 2, z: 0 },  // East wall
    { x: 0, y: wallHeight / 2, z: -10 / 2 }, // South wall
    { x: -10 / 2, y: wallHeight / 2, z: 0 }  // West wall
  ];

  const wallSizes = [
    { x: 20, y: wallHeight, z: 0 }, // North and South walls
    { x: 0, y: wallHeight, z: 20 }  // East and West walls
  ];

  wallPositions.forEach((pos, index) => {
    const wallGeometry = new THREE.BoxGeometry(wallSizes[index % 2].x, wallSizes[index % 2].y, wallSizes[index % 2].z);
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.set(pos.x, pos.y, pos.z);
    scene.add(wallMesh);

    // Add physics for walls
    const wallBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z));
    const wallCollider = world.createCollider(RAPIER.ColliderDesc.cuboid(wallSizes[index % 2].x / 2, wallSizes[index % 2].y / 2, wallSizes[index % 2].z / 2), wallBody, new RAPIER.Vector3(pos.x, pos.y, pos.z));
    wallCollider.setCollisionGroups(0x110D0004);
    wallCollider.setSolverGroups(0x110D0004);
  });
}

function makeGameHook() {
  const startPosition = { x: 0, y: 5, z: 0 };
  const segmentLength = 1;
  const numSegments = 3;

  const { bodies, joints } = createLineWithJoints(world, startPosition, segmentLength, numSegments);

}

import('@dimforge/rapier3d').then(rapeirModel => {

  init();

  // Use the RAPIER module here.
  let gravity = { x: 0.0, y: -9.81, z: 0.0 };
  RAPIER = rapeirModel;
  world = new RAPIER.World(gravity);
  eventQueue = new RAPIER.EventQueue(true);

  makeBoard();
  // makeGameHook();

  // Spawn a ball every second
  setInterval(spawnBallRandom, 500);

})

function init() {

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x505050);
  scene.add(new AxesHelper(2));

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 150);
  camera.position.set(0, 15, 25);

  scene.add(new THREE.HemisphereLight(0xbbbbbb, 0x888888, 3));

  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);

  //

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  //

  const controls = new OrbitControls(camera, renderer.domElement);

  controls.target.y = 1.6;
  controls.update();

  document.body.appendChild(XRButton.createButton(renderer, {
    'optionalFeatures': ['depth-sensing'],
    'depthSensing': { 'usagePreference': ['gpu-optimized'], 'dataFormatPreference': [] }
  }));

  // controllers

  function onSelectStart() {

    this.userData.isSelecting = true;

  }

  function onSelectEnd() {

    this.userData.isSelecting = false;

  }

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener('selectstart', onSelectStart);
  controller1.addEventListener('selectend', onSelectEnd);
  controller1.addEventListener('connected', function (event) {

    this.add(buildController(event.data));

  });
  controller1.addEventListener('disconnected', function () {

    this.remove(this.children[0]);

  });
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener('selectstart', onSelectStart);
  controller2.addEventListener('selectend', onSelectEnd);
  controller2.addEventListener('connected', function (event) {

    this.add(buildController(event.data));

  });
  controller2.addEventListener('disconnected', function () {

    this.remove(this.children[0]);

  });
  scene.add(controller2);

  // The XRControllerModelFactory will automatically fetch controller models
  // that match what the user is holding as closely as possible. The models
  // should be attached to the object returned from getControllerGrip in
  // order to match the orientation of the held device.

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
  scene.add(controllerGrip1);

  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
  scene.add(controllerGrip2);

  //

  window.addEventListener('resize', onWindowResize);

}

function buildController(data) {

  let geometry, material;

  switch (data.targetRayMode) {

    case 'tracked-pointer':

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, - 1], 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));

      material = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending });

      return new THREE.Line(geometry, material);

    case 'gaze':

      geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, - 1);
      material = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });
      return new THREE.Mesh(geometry, material);

  }

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

function handleController(controller) {

  if (controller.userData.isSelecting) {

    physics.setMeshPosition(spheres, controller.position, count);

    velocity.x = (Math.random() - 0.5) * 2;
    velocity.y = (Math.random() - 0.5) * 2;
    velocity.z = (Math.random() - 9);
    velocity.applyQuaternion(controller.quaternion);

    physics.setMeshVelocity(spheres, velocity, count);

    if (++count === spheres.count) count = 0;

  }

}

function animate() {
  stats.begin();
  handleController(controller1);
  handleController(controller2);

  updatePhysics();

  renderer.render(scene, camera);
  stats.end();
}

function updatePhysics() {
  if (world) {
    world.step(eventQueue);
    processEvents(eventQueue);

    handleToMesh.forEach((mesh, key) => {
      let rigidBody = mesh.userData.rigidBody;

      if (rigidBody.bodyType() == 0) {

        let position = rigidBody.translation();

        mesh.position.copy(position);
      }
    })
  }
}