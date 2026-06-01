// Global Variables //
/**
 * Creates a new Babylon.js scene.
 * @param {BABYLON.Engine} engine - The Babylon.js engine to use.
 * @param {HTMLCanvasElement} canvas - The canvas element to render the scene on.
 * @param {BABYLON.DirectionalLight} dirLight - The canvas element to render the scene on.
 * @param {BABYLON.HemisphericLight} hemiLight - The canvas element to render the scene on.
 * @param {BABYLON.ArcRotateCamera} camera - The canvas element to render the scene on.
 * @param {BABYLON.ShadowGenerator} shadowGenerator - The canvas element to render the scene on.
 * @returns {BABYLON.Scene} The new Babylon.js scene.
 */

// On Document Loaded - Start Game //
document.addEventListener("DOMContentLoaded", startGame);

// Global BabylonJS Variables
var canvas = document.getElementById("renderCanvas");
var engine = new BABYLON.Engine(canvas, true, { stencil: true }, true);
var scene = createScene(engine, canvas);
var camera = new BABYLON.ArcRotateCamera("camera", BABYLON.Tools.ToRadians(-90), BABYLON.Tools.ToRadians(65), 6, BABYLON.Vector3.Zero(), scene);
var dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0,0,0), scene);
// var hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
var shadowGenerator = new BABYLON.ShadowGenerator(1024, dirLight, true);

var ground;
var hdrTexture;
var hdrRotation = 0;

var infoCard, infoTitle, infoDescription, animation;
var highlightLayer = new BABYLON.HighlightLayer("highlightLayer", scene);

// Create Scene
function createScene(engine, canvas) {
    // Set Canvas & Engine //
    canvas = document.getElementById("renderCanvas");
    engine.clear(new BABYLON.Color3(0, 0, 0), true, true);
    var scene = new BABYLON.Scene(engine);
    return scene;
}

// Start Game
function startGame() {
    // Set Canvas & Engine //
    var toRender = function () {
        scene.render();
    }
    engine.runRenderLoop(toRender);

    // Glow Layer //
    var gl = new BABYLON.GlowLayer("glow", scene, { 
        mainTextureFixedSize: 512,
        blurKernelSize: 64
    });
    gl.intensity = 0.7;

    // ArcRotateCamera //
    camera.position.z = 10;
    camera.setTarget(new BABYLON.Vector3(0, 0.05, 0));
    camera.allowUpsideDown = false;
    camera.panningSensibility = 0;
    camera.lowerRadiusLimit = 0.5;
    camera.upperRadiusLimit = 3;
    camera.lowerBetaLimit = 0.75;
    camera.upperBetaLimit = Math.PI / 2;
    camera.panningSensibility = 0;
    camera.pinchDeltaPercentage = 0.00080;
    camera.wheelPrecision = 250;
    camera.useBouncingBehavior = false;
    camera.useAutoRotationBehavior = true;
    camera.autoRotationBehavior.idleRotationSpeed = 0.15;
    camera.minZ = 0.1;
    camera.radius = 1;
    camera.alpha = 0;
    camera.beta = Math.PI / 2.5;
    camera.attachControl(canvas, true);

    // Directional Light //
    dirLight.intensity = 1.0;
    dirLight.position = new BABYLON.Vector3(0,3,1);
    dirLight.direction = new BABYLON.Vector3(-3, -5.5, -5);
    dirLight.shadowMinZ = 0;
    dirLight.shadowMaxZ = 3;

    importModelAsync("RetroGame_Model_5.glb");
    
    setLighting();    
    setReflections();

    // scene.debugLayer.show({embedMode: true}).then(function () {
    // });
}

// Load Models Async Function //
function importModelAsync(model) {
    Promise.all([

        BABYLON.SceneLoader.ImportMeshAsync(null, "./resources/models/" , model, scene).then(function (result) {
            var baseMaterial = scene.getMaterialByName("Base");

            var lmTexture = new BABYLON.Texture("./resources/models/baseLM.png")
            baseMaterial.lightmapTexture = lmTexture;
            baseMaterial.useLightmapAsShadowmap = true;
            baseMaterial.lightmapTexture.uAng = Math.PI;
            baseMaterial.lightmapTexture.level = 1.3;
            baseMaterial.lightmapTexture.coordinatesIndex = 1;  

            animation = scene.getAnimationGroupByName("Animation");
            animation.stop();

            scene.getMeshByName("Panel_03").receiveShadows = true;
            scene.getMeshByName("Cylinder001_primitive0").receiveShadows = true;
            scene.getMeshByName("Cylinder001_primitive0").material.roughness = 0.4;
            scene.getMeshByName("knobShadow").visibility = 0.6;
        }),

    ]).then(() => {
        console.log("ALL Loaded");
        setReflections();
        setShadows();
        setActions();

        if (!localStorage.getItem("selectedColor"))
            localStorage.setItem("selectedColor", 0);
        setPanelColor(localStorage.getItem("selectedColor"));

        setTimeout(() => {
            hideLoadingView();              
        }, 500);
    });
}

// Environment Lighting
function setLighting() {
    hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./resources/env/environment_4.env", scene);
    hdrTexture.rotationY = BABYLON.Tools.ToRadians(hdrRotation);
    hdrSkybox = BABYLON.MeshBuilder.CreateBox("skybox", {size: 1024}, scene);
    var hdrSkyboxMaterial = new BABYLON.PBRMaterial("skybox", scene);
    hdrSkyboxMaterial.backFaceCulling = false;
    hdrSkyboxMaterial.reflectionTexture = hdrTexture.clone();
    hdrSkyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    hdrSkyboxMaterial.microSurface = 0.4;
    hdrSkyboxMaterial.disableLighting = true;
    hdrSkybox.material = hdrSkyboxMaterial;
    hdrSkybox.infiniteDistance = true;
}

// Set Shadows
function setShadows() {
    scene.meshes.forEach(function(mesh) {
        if (mesh.name != "skybox" && 
        mesh.name.includes("Panel") 
        || mesh.name.includes("Speak") 
        || mesh.name.includes("Pantalla")
        || mesh.name.includes("Puerta")
        || mesh.name.includes("knob")
        || mesh.name.includes("XboxController_primitive0")
        || mesh.name.includes("XboxController_primitive1")
        )
        {
            shadowGenerator.darkness = 0.1;
            shadowGenerator.bias = 0.0005;
            shadowGenerator.useBlurCloseExponentialShadowMap = true;
            shadowGenerator.addShadowCaster(mesh);
        }
    });
}

// Set Reflections
function setReflections() {
    scene.materials.forEach(function (material) {
        if (material.name != "skybox") {
            material.reflectionTexture = hdrTexture;
            material.reflectionTexture.level = 0.6;
            material.environmentIntensity = 0.7;
            material.disableLighting = false;
        }
    });
}

function setActions() {  

    infoCard = document.getElementById("info-card");
    infoTitle = document.getElementById("info-title");
    infoDescription = document.getElementById("info-description");

    scene.onPointerObservable.add((pointerInfo) => {
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERTAP:

            infoCard.classList.remove("active");
            highlightLayer.removeAllMeshes();
            scene.getMeshByName("knobShadow").visibility = 0.6;

            // animation.pause();
            // animation.start(false, 1.0, animation.masterFrame, 0, true);
            // animation.start(false, 1.0, 200, 0, true);

            var pickedMesh = pointerInfo.pickInfo.pickedMesh;
            if(pickedMesh && pickedMesh.name.includes("Pantalla_primitive")) {

                highlightLayer.addMesh(scene.getMeshByName("Pantalla_primitive0"), BABYLON.Color3.FromHexString("#FFC53F"));
                document.getElementById("intro-text").style.display = "none";
                document.getElementById("panel-colors").style.display = "none";

                infoCard.classList.add("active");    
                infoTitle.innerText = 'Retro Game Station'
                infoDescription.innerText = '7" FullHD touchscreen that offers you smooth and natural visuals. Emuelec System with more than 5,000 games available. Battery with autonomy of up to 4 hours.'
            }

            if(pickedMesh && pickedMesh.name.includes("knob")) {

                highlightLayer.addMesh(pickedMesh, BABYLON.Color3.FromHexString("#FFC53F"));
                document.getElementById("intro-text").style.display = "none";
                document.getElementById("panel-colors").style.display = "none";

                infoCard.classList.add("active");           
                infoTitle.innerText = 'Audio Controller';
                infoDescription.innerText = 'High Quality Amplifier Board Arcade Amplifier Dual Channel Stereo Audio Amplifier Board AMP.';
            }

            if(pickedMesh && pickedMesh.name.includes("Xbox")) {

                highlightLayer.addMesh(scene.getMeshByName("XboxController_primitive0"), BABYLON.Color3.FromHexString("#FFC53F"));
                highlightLayer.addMesh(scene.getMeshByName("XboxController_primitive1"), BABYLON.Color3.FromHexString("#FFC53F"));
                highlightLayer.addMesh(scene.getMeshByName("XboxController_primitive2"), BABYLON.Color3.FromHexString("#FFC53F"));
                document.getElementById("intro-text").style.display = "none";
                document.getElementById("panel-colors").style.display = "none";

                infoCard.classList.add("active");     
                infoTitle.innerText = 'Wireless Gaming Controller';
                infoDescription.innerText = 'Compatible with the main gaming controllers on the market using Bluetooth technology.';
            }

            if(pickedMesh && pickedMesh.name.includes("GridSpeak")) {

                highlightLayer.addMesh(scene.getMeshByName("GridSpeak_1_primitive0"), BABYLON.Color3.FromHexString("#FFC53F"));
                highlightLayer.addMesh(scene.getMeshByName("GridSpeak_2_primitive0"), BABYLON.Color3.FromHexString("#FFC53F"));
                document.getElementById("intro-text").style.display = "none";
                document.getElementById("panel-colors").style.display = "none";

                infoCard.classList.add("active");   
                infoTitle.innerText = 'Stereo Speakers';
                infoDescription.innerText = 'Compact stereo speakers with a power of 5W, offering perfect sound quality for your retro games.';
            }

            if(pickedMesh && pickedMesh.name.includes("Puerta")) {

                animation.start(false, 1.2, 0, 680, true);

                animation.onAnimationEndObservable.addOnce((eventData, eventState) => {
                    highlightLayer.removeMesh(pickedMesh);
                });

                highlightLayer.addMesh(pickedMesh, BABYLON.Color3.FromHexString("#FFC53F"));
                document.getElementById("intro-text").style.display = "none";
                document.getElementById("panel-colors").style.display = "flex";

                // infoCard.classList.add("active");    
                infoTitle.innerText = 'Accessible door';
                infoDescription.innerText = "Designed to access your device's peripherals and configuration.";
            }

            if(pickedMesh && pickedMesh.name.includes("Panel")) {

                highlightLayer.addMesh(scene.getMeshByName("Panel_01"), BABYLON.Color3.FromHexString("#FFC53F"));
                highlightLayer.addMesh(scene.getMeshByName("Panel_02_primitive0"), BABYLON.Color3.FromHexString("#FFC53F"));
                highlightLayer.addMesh(scene.getMeshByName("Panel_02_primitive1"), BABYLON.Color3.FromHexString("#FFC53F"));
                highlightLayer.addMesh(scene.getMeshByName("Panel_03"), BABYLON.Color3.FromHexString("#FFC53F"));
                highlightLayer.addMesh(scene.getMeshByName("Panel_04"), BABYLON.Color3.FromHexString("#FFC53F"));
                highlightLayer.addMesh(scene.getMeshByName("Panel_05"), BABYLON.Color3.FromHexString("#FFC53F"));
                highlightLayer.addMesh(scene.getMeshByName("Panel_06"), BABYLON.Color3.FromHexString("#FFC53F"));
                highlightLayer.addMesh(scene.getNodeByName("Panel_frontal_primitive0"), BABYLON.Color3.FromHexString("#FFC53F"));
                scene.getMeshByName("knobShadow").visibility = 0;
  
                document.getElementById("intro-text").style.display = "none";
                document.getElementById("panel-colors").style.display = "flex";

                infoCard.classList.add("active");     
                infoTitle.innerText = 'MDF Panel Designed';
                infoDescription.innerText = 'Custom designed and handcrafted in MDF panels, taking care of every detail.';
            }

            break;
            case BABYLON.PointerEventTypes.POINTERDOUBLETAP:

            break;
        }
    });
}

function hideInfoCard() {  
    infoCard.classList.remove("active");
    highlightLayer.removeAllMeshes();
    scene.getMeshByName("knobShadow").visibility = 0.6;
}

function setPanelColor(color) {  

    localStorage.setItem("selectedColor", color);
 
    document.getElementById("color-bt-0").classList.remove("color-active");
    document.getElementById("color-bt-1").classList.remove("color-active");
    document.getElementById("color-bt-2").classList.remove("color-active");
    document.getElementById("color-bt-3").classList.remove("color-active");
    document.getElementById("color-bt-4").classList.remove("color-active");

    var basePanelMaterial = scene.getMaterialByName("baseColor");
    var metalPaintedMaterial = scene.getMaterialByName("metalPainted");
    if (localStorage.getItem("selectedColor") == 0)
    {
        basePanelMaterial.albedoColor = new BABYLON.Color3.FromHexString("#edeadc");
        metalPaintedMaterial.albedoColor = new BABYLON.Color3.FromHexString("#edeadc");
        document.getElementById("color-bt-0").classList.add("color-active");
        document.getElementById("main-title").style.filter = "drop-shadow(0px 0px 15px #edeadc)";
    } else if (localStorage.getItem("selectedColor") == 1) {
        basePanelMaterial.albedoColor = new BABYLON.Color3.FromHexString("#60c5ff");
        metalPaintedMaterial.albedoColor = new BABYLON.Color3.FromHexString("#60c5ff");
        document.getElementById("color-bt-1").classList.add("color-active");
        document.getElementById("main-title").style.filter = "drop-shadow(0px 0px 15px #60c5ff)";
    } else if (localStorage.getItem("selectedColor") == 2) {
        basePanelMaterial.albedoColor = new BABYLON.Color3.FromHexString("#c44141");
        metalPaintedMaterial.albedoColor = new BABYLON.Color3.FromHexString("#c44141");
        document.getElementById("color-bt-2").classList.add("color-active");
        document.getElementById("main-title").style.filter = "drop-shadow(0px 0px 15px #c44141)";
    } else if (localStorage.getItem("selectedColor") == 3) {
        basePanelMaterial.albedoColor = new BABYLON.Color3.FromHexString("#ec8cc7");
        metalPaintedMaterial.albedoColor = new BABYLON.Color3.FromHexString("#ec8cc7");
        document.getElementById("color-bt-3").classList.add("color-active");
        document.getElementById("main-title").style.filter = "drop-shadow(0px 0px 15px #ec8cc7)";
    } else if (localStorage.getItem("selectedColor") == 4) {
        basePanelMaterial.albedoColor = new BABYLON.Color3.FromHexString("#1b1b1b");
        metalPaintedMaterial.albedoColor = new BABYLON.Color3.FromHexString("#1b1b1b");
        document.getElementById("color-bt-4").classList.add("color-active");
        document.getElementById("main-title").style.filter = "drop-shadow(0px 0px 15px #1b1b1b)";
    }
   
}

// Hide Loading View
function hideLoadingView() {
    document.getElementById("loadingDiv").style.display = "none";
}

// Resize Window
window.addEventListener("resize", function () {
    engine.resize();
});