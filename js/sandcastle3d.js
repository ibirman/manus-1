// 3D View for Sandcastle Builder Game
// This file handles the 3D visualization of the sandcastle

class SandcastleViewer3D {
    constructor(gameGrid, waterLine) {
        this.gameGrid = gameGrid;
        this.waterLine = waterLine;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.container = null;
        this.isInitialized = false;
    }

    // Initialize the 3D scene
    initialize() {
        // Create container for 3D view
        this.container = document.createElement('div');
        this.container.id = 'threeDContainer';
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.container.style.zIndex = '1000';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.alignItems = 'center';
        this.container.style.justifyContent = 'center';

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close 3D View';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '20px';
        closeButton.style.right = '20px';
        closeButton.style.padding = '10px 15px';
        closeButton.style.backgroundColor = '#4682b4';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.zIndex = '1001';
        closeButton.addEventListener('click', () => this.close());
        this.container.appendChild(closeButton);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.8);
        this.renderer.setClearColor(0x87CEEB); // Sky blue background
        this.container.appendChild(this.renderer.domElement);

        // Create scene
        this.scene = new THREE.Scene();

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            (window.innerWidth * 0.8) / (window.innerHeight * 0.8), 
            0.1, 
            1000
        );
        this.camera.position.set(30, 30, 30);
        this.camera.lookAt(0, 0, 0);

        // Add orbit controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        this.controls.screenSpacePanning = false;
        this.controls.maxPolarAngle = Math.PI / 2;

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Add directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Add instructions
        const instructions = document.createElement('div');
        instructions.style.position = 'absolute';
        instructions.style.bottom = '20px';
        instructions.style.left = '20px';
        instructions.style.color = 'white';
        instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        instructions.style.padding = '10px';
        instructions.style.borderRadius = '5px';
        instructions.innerHTML = 'Click and drag to rotate<br>Scroll to zoom<br>Right-click and drag to pan';
        this.container.appendChild(instructions);

        // Add to document
        document.body.appendChild(this.container);

        this.isInitialized = true;
    }

    // Render the sandcastle in 3D
    render() {
        if (!this.isInitialized) {
            this.initialize();
        }

        // Clear existing objects from scene
        while(this.scene.children.length > 0) { 
            this.scene.remove(this.scene.children[0]); 
        }

        // Add lights back
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        this.scene.add(directionalLight);

        // Create materials
        const waterMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1E90FF, 
            transparent: true, 
            opacity: 0.8 
        });
        const beachMaterial = new THREE.MeshStandardMaterial({ color: 0xF0E68C });
        const sandMaterials = [
            new THREE.MeshStandardMaterial({ color: 0xF0E68C }), // Level 1 (lightest)
            new THREE.MeshStandardMaterial({ color: 0xECD279 }),
            new THREE.MeshStandardMaterial({ color: 0xD8B740 }),
            new THREE.MeshStandardMaterial({ color: 0xC49B32 }),
            new THREE.MeshStandardMaterial({ color: 0xA67C00 })  // Level 5 (darkest)
        ];

        // Create ground plane
        const gridWidth = this.gameGrid.length;
        const gridHeight = this.gameGrid[0].length;
        
        // Center the grid in the scene
        const offsetX = -gridWidth / 2;
        const offsetY = -gridHeight / 2;

        // Create water plane
        const waterGeometry = new THREE.PlaneGeometry(gridWidth, this.waterLine);
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.rotation.x = -Math.PI / 2;
        water.position.set(offsetX + gridWidth / 2, 0, offsetY + this.waterLine / 2);
        this.scene.add(water);

        // Create beach plane
        const beachGeometry = new THREE.PlaneGeometry(gridWidth, gridHeight - this.waterLine);
        const beach = new THREE.Mesh(beachGeometry, beachMaterial);
        beach.rotation.x = -Math.PI / 2;
        beach.position.set(
            offsetX + gridWidth / 2, 
            0, 
            offsetY + this.waterLine + (gridHeight - this.waterLine) / 2
        );
        this.scene.add(beach);

        // Create sand blocks
        const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
        
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                const height = this.gameGrid[x][y];
                if (height > 0) {
                    // Create a cube for each level of sand
                    for (let h = 0; h < height; h++) {
                        const material = sandMaterials[Math.min(h, sandMaterials.length - 1)];
                        const cube = new THREE.Mesh(cubeGeometry, material);
                        cube.position.set(offsetX + x + 0.5, h + 0.5, offsetY + y + 0.5);
                        this.scene.add(cube);
                    }
                }
            }
        }

        // Add grid helper
        const gridHelper = new THREE.GridHelper(Math.max(gridWidth, gridHeight), Math.max(gridWidth, gridHeight));
        gridHelper.position.y = 0.01; // Slightly above the ground to avoid z-fighting
        this.scene.add(gridHelper);

        // Animation loop
        const animate = () => {
            if (!this.isInitialized) return;
            
            requestAnimationFrame(animate);
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        };
        
        animate();
    }

    // Close the 3D view
    close() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.isInitialized = false;
    }
}

// OrbitControls implementation (simplified version for this game)
// This is a minimal implementation of THREE.OrbitControls
THREE.OrbitControls = function(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.enabled = true;
    this.target = new THREE.Vector3();
    this.enableDamping = false;
    this.dampingFactor = 0.05;
    this.screenSpacePanning = true;
    this.minDistance = 0;
    this.maxDistance = Infinity;
    this.maxPolarAngle = Math.PI;
    
    // Private variables
    let scope = this;
    let STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2 };
    let state = STATE.NONE;
    let rotateStart = new THREE.Vector2();
    let rotateEnd = new THREE.Vector2();
    let rotateDelta = new THREE.Vector2();
    let panStart = new THREE.Vector2();
    let panEnd = new THREE.Vector2();
    let panDelta = new THREE.Vector2();
    let dollyStart = new THREE.Vector2();
    let dollyEnd = new THREE.Vector2();
    let dollyDelta = new THREE.Vector2();
    
    // Event handlers
    function onMouseDown(event) {
        event.preventDefault();
        
        if (event.button === 0) { // Left mouse button
            state = STATE.ROTATE;
            rotateStart.set(event.clientX, event.clientY);
        } else if (event.button === 1) { // Middle mouse button
            state = STATE.DOLLY;
            dollyStart.set(event.clientX, event.clientY);
        } else if (event.button === 2) { // Right mouse button
            state = STATE.PAN;
            panStart.set(event.clientX, event.clientY);
        }
        
        document.addEventListener('mousemove', onMouseMove, false);
        document.addEventListener('mouseup', onMouseUp, false);
    }
    
    function onMouseMove(event) {
        event.preventDefault();
        
        if (state === STATE.ROTATE) {
            rotateEnd.set(event.clientX, event.clientY);
            rotateDelta.subVectors(rotateEnd, rotateStart);
            
            // Rotate
            const element = scope.domElement;
            scope.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth);
            scope.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);
            
            rotateStart.copy(rotateEnd);
        } else if (state === STATE.DOLLY) {
            dollyEnd.set(event.clientX, event.clientY);
            dollyDelta.subVectors(dollyEnd, dollyStart);
            
            // Dolly
            if (dollyDelta.y > 0) {
                scope.dollyOut();
            } else if (dollyDelta.y < 0) {
                scope.dollyIn();
            }
            
            dollyStart.copy(dollyEnd);
        } else if (state === STATE.PAN) {
            panEnd.set(event.clientX, event.clientY);
            panDelta.subVectors(panEnd, panStart);
            
            // Pan
            scope.pan(panDelta.x, panDelta.y);
            
            panStart.copy(panEnd);
        }
        
        scope.update();
    }
    
    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove, false);
        document.removeEventListener('mouseup', onMouseUp, false);
        state = STATE.NONE;
    }
    
    function onMouseWheel(event) {
        event.preventDefault();
        
        if (event.deltaY < 0) {
            scope.dollyIn();
        } else if (event.deltaY > 0) {
            scope.dollyOut();
        }
        
        scope.update();
    }
    
    // Methods
    this.rotateLeft = function(angle) {
        // Rotate around vertical axis
        let quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        let offset = new THREE.Vector3().subVectors(camera.position, this.target);
        offset.applyQuaternion(quaternion);
        camera.position.copy(this.target).add(offset);
    };
    
    this.rotateUp = function(angle) {
        // Rotate around horizontal axis
        let quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
        let offset = new THREE.Vector3().subVectors(camera.position, this.target);
        offset.applyQuaternion(quaternion);
        camera.position.copy(this.target).add(offset);
    };
    
    this.dollyIn = function() {
        let offset = new THREE.Vector3().subVectors(camera.position, this.target);
        let dollyScale = 0.95;
        offset.multiplyScalar(dollyScale);
        camera.position.copy(this.target).add(offset);
    };
    
    this.dollyOut = function() {
        let offset = new THREE.Vector3().subVectors(camera.position, this.target);
        let dollyScale = 1.05;
        offset.multiplyScalar(dollyScale);
        camera.position.copy(this.target).add(offset);
    };
    
    this.pan = function(deltaX, deltaY) {
        let offset = new THREE.Vector3();
        let position = camera.position;
        offset.copy(position).sub(this.target);
        let targetDistance = offset.length();
        
        // Half of the fov is center to top of screen
        targetDistance *= Math.tan((camera.fov / 2) * Math.PI / 180.0);
        
        // We actually don't use screenWidth, since perspective camera is fixed to screen height
        let panLeft = function(distance) {
            let v = new THREE.Vector3();
            let objectMatrix = new THREE.Matrix4();
            objectMatrix.extractRotation(camera.matrix);
            v.setFromMatrixColumn(objectMatrix, 0); // Get X column
            v.multiplyScalar(-distance);
            camera.position.add(v);
            scope.target.add(v);
        };
        
        let panUp = function(distance) {
            let v = new THREE.Vector3();
            let objectMatrix = new THREE.Matrix4();
            objectMatrix.extractRotation(camera.matrix);
            v.setFromMatrixColumn(objectMatrix, 1); // Get Y column
            v.multiplyScalar(distance);
            camera.position.add(v);
            scope.target.add(v);
        };
        
        // Pan horizontally
        panLeft(2 * deltaX * targetDistance / scope.domElement.clientHeight);
        
        // Pan vertically
        panUp(2 * deltaY * targetDistance / scope.domElement.clientHeight);
    };
    
    this.update = function() {
        let offset = new THREE.Vector3().subVectors(camera.position, this.target);
        
        // Restrict radius to be between min and max
        let radius = offset.length();
        radius = Math.max(this.minDistance, Math.min(this.maxDistance, radius));
        offset.normalize().multiplyScalar(radius);
        
        // Move position back along offset
        camera.position.copy(this.target).add(offset);
        
        // Look at target
        camera.lookAt(this.target);
    };
    
    // Event listeners
    this.domElement.addEventListener('contextmenu', function(event) { event.preventDefault(); }, false);
    this.domElement.addEventListener('mousedown', onMouseDown, false);
    this.domElement.addEventListener('wheel', onMouseWheel, false);
    
    this.update();
    
    return this;
};
