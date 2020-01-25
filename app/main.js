/*
 Diffusion Profiler 2D
 Last Modified: 1-24-2020 3:33 PM PST

 Modified from examples provided by Abouzar Kaboudian, based on the Abubu.js library provided by Abouzar Kaboudian
 Original header:

 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * WEBGL 2.0    :   2D 3-Variable Model
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Thu 28 Sep 2017 11:33:48 AM EDT
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
define([    'require',
            'shader!vertShader.vert',
            'shader!initShader.frag',
            'shader!compShader.frag',
            'shader!paceShader.frag',
            'shader!clickShader.frag',
            'shader!bvltShader.frag',
            'Abubu/Abubu'
            ],
function(   require,
            vertShader,
            initShader,
            compShader,
            paceShader,
            clickShader,
            bvltShader,
            Abubu
            ){
"use strict" ;

/*========================================================================
 * Global Parameters
 *========================================================================
 */
var log = console.log ;
var params ;
var env ;
var gui ;

/*========================================================================
 * createGui
 *========================================================================
 */
function createGui(){
    env.gui = new Abubu.Gui() ;
    gui = env.gui.addPanel({width:300}) ;

/*-------------------------------------------------------------------------
 * Model Parameters
 *-------------------------------------------------------------------------
 */
    gui.mdlPrmFldr  =   gui.addFolder( 'Model Parameters'   ) ;


    addCoeficients(     gui.mdlPrmFldr, [ 'diffCoef'] ,
                        [env.comp1,env.comp2], {min:0}) ;


    changeParamType() ;

/*------------------------------------------------------------------------
 * Solver Parameters
 *------------------------------------------------------------------------
 */
    gui.slvPrmFldr  = gui.addFolder( 'Solver Parameters' ) ;
    gui.slvPrmFldr.add( env, 'dt').name('Delta t').onChange(
         function(){
            Abubu.setUniformInSolvers('dt', env.dt,
                    [env.comp1,env.comp2 ]) ;
         }
    );

    gui.slvPrmFldr.add( env, 'ds_x' ).name( 'Domain size-x').onChange(
        function(){
            Abubu.setUniformInSolvers('ds_x', env.ds_x,
                    [env.comp1,env.comp2 ]) ;
        }
    ) ;
    gui.slvPrmFldr.add( env, 'ds_y' ).name( 'Domain size-y').onChange(
        function(){
            Abubu.setUniformInSolvers('ds_y', env.ds_y,
                    [env.comp1,env.comp2 ]) ;
        }
    ) ;

    gui.slvPrmFldr.add( env, 'width').name( 'x-resolution' )
    .onChange( function(){
        Abubu.resizeRenderTargets(
                [fvfs,svfs], env.width, env.height);
    } ) ;

    gui.slvPrmFldr.add( env, 'height').name( 'y-resolution' )
    .onChange( function(){
        Abubu.resizeRenderTargets(
            [
                env.fvfs,
                env.svfs
            ],
            env.width,
            env.height);
    } ) ;

/*------------------------------------------------------------------------
 * Display Parameters
 *------------------------------------------------------------------------
 */
    gui.dspPrmFldr  = gui.addFolder( 'Display Parameters' ) ;
    gui.dspPrmFldr.add( env, 'colormap', Abubu.getColormapList() )
                .onChange(  function(){
                                env.disp.setColormap(env.colormap);
                                refreshDisplay() ;
                            }   ).name('Colormap') ;

    gui.dspPrmFldr.add( env, 'probeVisiblity').name('Probe Visiblity')
        .onChange(function(){
            env.disp.setProbeVisiblity(env.probeVisiblity);
            refreshDisplay() ;
        } ) ;
    gui.dspPrmFldr.add( env, 'frameRate').name('Frame Rate Limit')
        .min(60).max(40000).step(60)

    gui.dspPrmFldr.add( env, 'timeWindow').name('Signal Window [ms]')
    .onChange( function(){
        env.plot.updateTimeWindow(env.timeWindow) ;
        refreshDisplay() ;
    } ) ;

/*------------------------------------------------------------------------
 * tipt
 *------------------------------------------------------------------------
 */
    gui.tptPrmFldr = gui.dspPrmFldr.addFolder( 'Tip Trajectory') ;
    gui.tptPrmFldr.add( env, 'tiptVisiblity' )
        .name('Plot Tip Trajectory?')
        .onChange(function(){
            env.disp.setTiptVisiblity(env.tiptVisiblity) ;
            refreshDisplay() ;
        } ) ;
    gui.tptPrmFldr.add( env, 'tiptThreshold').name( 'Threshold [mv]')
        .onChange( function(){
                env.disp.setTiptThreshold( env.tiptThreshold ) ;
                } ) ;
    gui.tptPrmFldr.open() ;

    gui.dspPrmFldr.open() ;


/*------------------------------------------------------------------------
 * record
 *------------------------------------------------------------------------
 */
    gui.rec = gui.addFolder('Record Voltage @ Probe' ) ;
    gui.rec.recording = gui.rec.add(env.rec, 'recording')
    .name('recording?').onChange(
        function(){
            env.rec.recorder.setRecordingStatus( env.rec.recording ) ;
        } ).listen() ;
    gui.rec.add(env.rec, 'toggleRecording' ) ;
    gui.rec.add(env.rec, 'interval').onChange(function(){
        env.rec.recorder.setSampleRate(env.rec.interval) ;
    } ) ;
    gui.rec.add(env.rec, 'reset' ) ;
    gui.rec.add(env.rec, 'fileName') ;
    gui.rec.add(env.rec, 'save' ) ;

/*------------------------------------------------------------------------
 * save
 *------------------------------------------------------------------------
 */
    var svePrmFldr = gui.addFolder('Save Canvases') ;
    svePrmFldr.add( env, 'savePlot2DPrefix').name('File Name Prefix') ;
    svePrmFldr.add( env, 'savePlot2D' ) ;

    svePrmFldr.open() ;
/*------------------------------------------------------------------------
 * Inteval Caller
 *------------------------------------------------------------------------
 */
    var intFldr = gui.addFolder( 'Interval Caller' ) ;
    intFldr.add(env, 'autocall').name('Active?')
        .onChange(function(){
                env.intervalCaller.setActivity(env.autocall);
                } ) ;
    intFldr.add(env, 'autoCallback').name('Callback')
        .onChange(function(){
                env.intervalCaller.setCallback(function(){
                        try{ eval(env.autoCallback); }
                        catch(e){log('Error in Interval Caller'); log(e);} } ) } );
    intFldr.add(env, 'autocallInterval').name('interval')
        .onChange(function(){
                env.intervalCaller
                    .setInterval(env.autocallInterval)
                    } ) ;
    intFldr.open() ;

/*------------------------------------------------------------------------
 * Simulation
 *------------------------------------------------------------------------
 */
    gui.smlPrmFldr  = gui.addFolder(    'Simulation'    ) ;
    gui.smlPrmFldr.add( env,  'clickRadius' )
        .min(0.001).max(0.5).step(0.001)
        .name('Click Radius')
        .onChange(function(){
                env.click.setUniform('clickRadius',env.clickRadius) ;
                } ) ;
    gui.smlPrmFldr.add( env,  'srcTimer' )
        .min(0.01).max(100.0).step(0.01)
        .name('Source Timer')
        .onChange(function(){
                env.click.setUniform('srcTimer',env.srcTimer) ;
                } ) ;
    gui.smlPrmFldr.add( env,  'srcRate' )
        .min(0.0001).max(0.01).step(0.0001)
        .name('Source Rate')
        .onChange(function(){
                env.click.setUniform('srcRate',env.srcRate) ;
                } ) ;
    gui.smlPrmFldr.add( env,
        'clicker',
        [   'Create Exclusion',
            'Create Source',
            'Create Value',
            'Signal Loc. Picker',
            'Autopace Loc. Picker'  ] ).name('Clicker Type') ;

    gui.smlPrmFldr.add( env, 'time').name('Solution Time [ms]').listen() ;

    gui.smlPrmFldr.add( env, 'initialize').name('Initialize') ;
    gui.smlPrmFldr.add( env,  'srcAmt' )
        .min(1.0).max(100.0).step(1.0)
        .name('Num. of Init. Sources')
        .onChange(function(){
                env.click.setUniform('srcAmt',env.srcAmt) ;
                } ) ;
    gui.smlPrmFldr.add( env,  'rDisp' )
        .min(0.01).max(0.5).step(0.001)
        .name('Max Disp. radius')
        .onChange(function(){
                env.click.setUniform('rDisp',env.rDisp) ;
                } ) ;
    gui.smlPrmFldr.add( env, 'solve').name('Solve/Pause') ;
    gui.smlPrmFldr.add( env, 'dostep').name('Do Step') ;
    gui.smlPrmFldr.open() ;

/*------------------------------------------------------------------------
 * addCoeficients
 *------------------------------------------------------------------------
 */
    function addCoeficients( fldr,
            coefs,
            solvers ,
            options ){
        var coefGui = {} ;
        var min = undefined ;
        var max = undefined ;
        if (options != undefined ){
            if (options.min != undefined ){
                min = options.min ;
            }
            if (options.max != undefined ){
                max = options.max ;
            }
        }
        for(var i=0; i<coefs.length; i++){
            var coef = addCoef(fldr,coefs[i],solvers) ;
            if (min != undefined ){
                coef.min(min) ;
            }
            if (max != undefined ){
                coef.max(max) ;
            }
            coefGui[coefs[i]] = coef ;
        }
        return coefGui ;

        /* addCoef */
        function addCoef( fldr,
                coef,
                solvers     ){
            var coefGui =   fldr.add( env, coef )
                .onChange(
                        function(){
                        Abubu.setUniformInSolvers(  coef,
                                env[coef],
                                solvers  ) ;
                        } ) ;

            return coefGui ;

        }
    }

    return ;
} /* End of createGui */

/*------------------------------------------------------------------------
 * changeParamType
 *------------------------------------------------------------------------
 */
function changeParamType(){
    var paramVals = [] ;
    switch (params['paramType']){
        case 'set_01':
            env.tau_pv      = 3.33    ;

            break ;
    } /* End of switch */

    var paramList = [
                'tau_pv',

            ] ;

    Abubu.setUniformsInSolvers( paramList, [
        env.tau_pv
   ] , [env.comp1, env.comp2 ] ) ;
    for(var i=0; i<gui.mdlPrmFldr.__controllers.length;i++){
        gui.mdlPrmFldr.__controllers[i].updateDisplay() ;
    }


}
/*========================================================================
 * Environment
 *========================================================================
 */
function Environment(){
    this.running = false ;

    /* Model Parameters         */
    this.C_m        = 1.0 ;
    this.diffCoef   = 0.001 ;

    this.minVlt     = -90 ;
    this.maxVlt     = 30 ;

    /* time coeficients         */
    this.paramType   = 'set_04' ;
    this.tau_pv      = 3.33    ;


    /* Display Parameters       */
    this.colormap    =   'rainbowHotSpring';
    this.dispWidth   =   512 ;
    this.dispHeight  =   512 ;
    this.frameRate   =   2400 ;
    this.timeWindow  =   1000 ;
    this.probeVisiblity = false ;

    this.tiptVisiblity= false ;
    this.tiptThreshold=  .5 ;
    this.tiptColor    = "#FFFFFF";

    /* Solver Parameters        */
    this.width       =   512 ;
    this.height      =   512 ;
    this.dt          =   5.e-2 ;
    this.cfl         =   1.0 ;
    this.ds_x        =   18 ;
    this.ds_y        =   18 ;

    /* Autopace                 */
    this.pacing      = false ;
    this.pacePeriod  = 300 ;
    this.autoPaceRadius= 0.01 ;

    /* Solve                    */
    this.solve       = function(){
        this.running = !this.running ;
        return ;
    } ;
    this.time        = 0.0 ;
    this.clicker     = 'Pace Region';

    this.autoBreakThreshold = -40 ;
    //this.bvltNow     = breakVlt ;
    this.ry          = 0.5 ;
    this.lx          = 0.5 ;
    this.autobreak   = true ;

    this.autostop    = false;
    this.autostopInterval = 300 ;

    this.savePlot2DPrefix = '' ;
    this.savePlot2D    = function(){
        //this.running = false ;
        var prefix ;
        try{
            prefix = eval(env.savePlot2DPrefix) ;
        }catch(e){
            prefix = this.savePlot2DPrefix ;
        }
        Abubu.saveCanvas( 'canvas_1',
        {
            prefix  : prefix,
            format  : 'png'
        } ) ;
    }

    /* Clicker                  */
    this.clickRadius     = 0.01 ;
    this.srcTimer     = 10.0 ;
    this.srcRate     = 0.1 ;
    this.clickPosition   = [0.5,0.5] ;
    this.exclValue = [0.,0.,0.,0.] ;
    this.srcValue       = [1.0,1.0,1.0,1.0] ;
    this.stcValue       = [1.0,0.,0.,1.0] ;


    /* intervalCaller */
    this.autocall = false ;
    this.autoCallback = '' ;
    this.autocallInterval = 300 ;

    this.srcAmt = 6 ;
    this.rDisp = 0.25 ;


    /* Recording */
    this.rec = {} ;
    this.rec.recording = false ;
    this.rec.toggleRecording = function(){
        env.rec.recording = !env.rec.recording ;
        env.rec.recorder.setRecordingStatus(this.recording) ;
    } ;
    this.rec.reset = function(){
        env.rec.recorder.resetRecording(); },
    this.rec.interval = 10 ;
    this.rec.fileName = 'vlt.dat' ;
    this.rec.save = function(){
        var fileName ;
        try{
            fileName = eval(env.rec.fileName) ;
        }catch(e){
            fileName = env.rec.fileName ;
        }
        if ( fileName == undefined ){
            fileName = 'vlt.dat' ;
        }
        env.rec.recorder.setFileName(fileName) ;
        env.rec.recorder.save() ;
    } ;

}





/*========================================================================
 * Initialization of the GPU and Container
 *========================================================================
 */
function loadWebGL()
{
    var canvas_1 = document.getElementById("canvas_1") ;
    var canvas_2 = document.getElementById("canvas_2") ;

    canvas_1.width  = 512 ;
    canvas_1.height = 512 ;

    env = new Environment() ;
    params = env ;
/*-------------------------------------------------------------------------
 * stats
 *-------------------------------------------------------------------------
 */
    var stats       = new Stats() ;
    document.body.appendChild( stats.domElement ) ;

/*------------------------------------------------------------------------
 * defining all render targets
 *------------------------------------------------------------------------
 */
    env.fvfs     = new Abubu.FloatRenderTarget(512, 512) ;
    env.svfs     = new Abubu.FloatRenderTarget(512, 512) ;
    //env.dspr     = new Abubu.FloatRenderTarget(512, 512) ;

/*------------------------------------------------------------------------
 * init solver to initialize all textures
 *------------------------------------------------------------------------
 */
    env.init  = new Abubu.Solver( {
       fragmentShader  : initShader.value ,
       vertexShader    : vertShader.value ,
       renderTargets   : {
           outFvfs    : { location : 0, target: env.fvfs     } ,
           outSvfs    : { location : 1, target: env.svfs     } ,
       }
    } ) ;

/*------------------------------------------------------------------------
 * comp1 and comp2 solvers for time stepping
 *------------------------------------------------------------------------
 */
    env.compUniforms = function(_inVfs ){
        this.inVfs      = { type : 't',     value   : _inVfs        } ;
        this.tau_pv     = { type : 'f',     value : env.tau_pv      } ;


        this.ds_x        = { type : 'f',     value   : env.ds_x     } ;
        this.ds_y        = { type : 'f',     value   : env.ds_y     } ;
        this.diffCoef    = { type : 'f',     value   : env.diffCoef } ;
        this.C_m         = { type : 'f',     value   : env.C_m      } ;
        this.dt          = { type : 'f',     value   : env.dt       } ;

    } ;

    env.compTargets = function(_outVfs){
        this.outVfs = { location : 0  , target :  _outVfs     } ;
    } ;

    env.comp1 = new Abubu.Solver( {
        fragmentShader  : compShader.value,
        vertexShader    : vertShader.value,
        uniforms        : new env.compUniforms( env.fvfs    ) ,
        renderTargets   : new env.compTargets(  env.svfs    ) ,
    } ) ;

    env.comp2 = new Abubu.Solver( {
        fragmentShader  : compShader.value,
        vertexShader    : vertShader.value,
        uniforms        : new env.compUniforms( env.svfs    ) ,
        renderTargets   : new env.compTargets(  env.fvfs    ) ,
    } ) ;

/*------------------------------------------------------------------------
 * click solver
 *------------------------------------------------------------------------
 */
    env.click = new Abubu.Solver( {
        vertexShader    : vertShader.value ,
        fragmentShader  : clickShader.value ,
        uniforms        : {
            map             : { type: 't',  value : env.fvfs           } ,
            clickValue      : { type: 'v4', value :
                new Float32Array(1,0,0,0)         } ,
            clickPosition   : { type: 'v2', value : env.clickPosition  } ,
            clickRadius     : { type: 'f',  value : env.clickRadius    } ,
            srcTimer     : { type: 'f',  value : env.srcTimer    } ,
            srcRate     : { type: 'f',  value : env.srcRate    } ,
        } ,
        renderTargets   : {
            FragColor   : { location : 0,   target : env.svfs      } ,
        } ,
        clear           : true ,
    } ) ;
    env.clickCopy = new Abubu.Copy(env.svfs, env.fvfs ) ;


/*------------------------------------------------------------------------
 * recorder.probe
 *------------------------------------------------------------------------
 */
    env.rec.probe = new Abubu.Probe( env.fvfs, { channel : 'r', 
    probePosition : [0.5,0.5] } ) ;
    env.rec.recorder = new Abubu.ProbeRecorder(env.rec.probe,
    { 
        sampleRate : env.rec.interval, 
        recording: false , 
        fileName : env.rec.fileName} ) ;

/*------------------------------------------------------------------------
 * pace
 *------------------------------------------------------------------------
 */
    env.pace = new Abubu.Solver({
            fragmentShader  : paceShader.value,
            vertexShader    : vertShader.value,
            uniforms        : {
                inVcxf      : { type: 't', value : env.svfs },
                } ,
            renderTargets: {
                outVcxf : {location : 0 , target : env.fvfs }
                }
            } ) ;

/*------------------------------------------------------------------------
 * Signal Plot
 *------------------------------------------------------------------------
 */
    env.plot = new Abubu.SignalPlot( {
            noPltPoints : 1024,
            grid        : 'on' ,
            nx          : 5 ,
            ny          : 7 ,
            xticks : { mode : 'auto', unit : 'ms', font:'11pt Times'} ,
            yticks : { mode : 'auto', unit : '', precision : 1 } ,
            canvas      : canvas_2,
    });

    env.plot.addMessage(    'Scaled Value at the Probe',
                        0.5,0.05,
                    {   font : "12pt Times" ,
                        align: "center"                          } ) ;

    env.vsgn = env.plot.addSignal( env.fvfs, {
            channel : 'r',
            minValue : -0.02 ,
            maxValue : 1.2 ,
            restValue: 0,
            color : [0.5,0,0],
            visible: true,
            linewidth : 3,
            timeWindow: env.timeWindow,
            probePosition : [0.5,0.5] , } ) ;

/*------------------------------------------------------------------------
 * disp
 *------------------------------------------------------------------------
 */
    env.disp= new Abubu.Plot2D({
        target : env.svfs ,
        prevTarget : env.fvfs ,
        colormap : env.colormap,
        canvas : canvas_1 ,
        minValue: 0 ,
        maxValue: 3.2 ,
        tipt : false ,
        tiptThreshold : env.tiptThreshold ,
        probeVisible : false ,
        colorbar : true ,
        cblborder: 15 ,
        cbrborder: 15 ,
        unit : '',
    } );
    env.disp.hideColorbar() ;
//    env.disp.showColorbar() ;
//    env.disp.addMessage(  '3-Variable Model',
//                        0.05,   0.05, /* Coordinate of the
//                                         message ( x,y in [0-1] )   */
//                        {   font: "Bold 14pt Arial",
//                            style:"#000000",
//                            align : "start"             }   ) ;
//    env.disp.addMessage(  'Simulation by Abouzar Kaboudian @ CHAOS Lab',
//                        0.05,   0.1,
//                        {   font: "italic 10pt Arial",
//                            style: "#000000",
//                            align : "start"             }  ) ;
//
/*------------------------------------------------------------------------
 * intervalCaller
 *------------------------------------------------------------------------
 */
    env.intervalCaller = new Abubu.IntervalCaller({
        interval : env.autocallInterval  ,
        callback : function(){
            try{
                eval(env.autoCallback) ;
            }catch(e){
            }
        } ,
        active : env.autocall ,
    } ) ;

/*------------------------------------------------------------------------
 * initialize
 *------------------------------------------------------------------------
 */
    env.initialize = function(){
        env.time = 0 ;
        
        env.paceTime = 0 ;
        env.breaked = false ;
        env.init.render() ;
        env.plot.init(0) ;
        env.disp.initialize() ;
        refreshDisplay() ;
        for(var i=0 ; i< env.srcAmt ; i++){
            env.clickPosition[0] = 0.5 + 2*env.rDisp*(Math.random() - 0.5)
            env.clickPosition[1] = 0.5 + 2*env.rDisp*(Math.random() - 0.5)
            env.click.setUniform('clickPosition',env.clickPosition) ;
            env.click.setUniform('clickValue',env.srcValue) ;
            clickSolve() ;
            
        }
        requestAnimationFrame(clickSolve) ;
    }


/*------------------------------------------------------------------------
 * Do Step
 *------------------------------------------------------------------------
 */
env.dostep = function(){
    env.comp1.render() ;
    env.comp2.render() ;
    env.time += 2.0*env.dt ;
    env.paceTime += 2.0*env.dt ;
    stats.update();
    stats.update() ;
    env.disp.updateTipt() ;
    env.plot.update(env.time) ;
    env.intervalCaller.call(env.time) ;
    refreshDisplay() ;
    console.log(env.outVfs)
}

/*-------------------------------------------------------------------------
 * Render the programs
 *-------------------------------------------------------------------------
 */
   env.initialize() ;

/*------------------------------------------------------------------------
 * createGui
 *------------------------------------------------------------------------
 */
   createGui() ;

/*------------------------------------------------------------------------
 * clicker
 *------------------------------------------------------------------------
 */
    canvas_1.addEventListener("click",      onClick,        false   ) ;
    canvas_1.addEventListener('mousemove',
            function(e){
                if ( e.buttons >=1 ){
                    onClick(e) ;
                }
            } , false ) ;

/*------------------------------------------------------------------------
 * rendering the program ;
 *------------------------------------------------------------------------
 */
    env.render = function(){
        if (env.running){
            for(var i=0 ; i< env.frameRate/120 ; i++){
                env.comp1.render() ;
                env.comp2.render() ;
                env.time += 2.0*env.dt ;
                env.paceTime += 2.0*env.dt ;
                stats.update();
                stats.update() ;
                env.disp.updateTipt() ;
                env.plot.update(env.time) ;
                env.rec.recorder.record(env.time) ;
                env.intervalCaller.call(env.time) ;
            }
           // if ((env.paceTime > 400 ) && !env.breaked){
           //     env.breaked = true ;
           //     env.paceTime = 0. ;
           //     env.pace.render() ;
           // }
            refreshDisplay();
        }
        requestAnimationFrame(env.render) ;
    }

/*------------------------------------------------------------------------
 * add environment to document
 *------------------------------------------------------------------------
 */
    document.env = env ;

/*------------------------------------------------------------------------
 * render the webgl program
 *------------------------------------------------------------------------
 */
    env.render();

}/*  End of loadWebGL  */

/*========================================================================
 * refreshDisplay
 *========================================================================
 */
function refreshDisplay(){
    env.disp.render() ;
    env.plot.render() ;
}

/*========================================================================
 * onClick
 *========================================================================
 */
function onClick(e){
    env.clickPosition[0] =
        (e.clientX-canvas_1.offsetLeft) / env.dispWidth ;
    env.clickPosition[1] =  1.0-
        (e.clientY-canvas_1.offsetTop) / env.dispWidth ;

    env.click.setUniform('clickPosition',env.clickPosition) ;

    if (    env.clickPosition[0]   >   1.0 ||
            env.clickPosition[0]   <   0.0 ||
            env.clickPosition[1]   >   1.0 ||
            env.clickPosition[1]   <   0.0 ){
        return ;
    }
    clickRender() ;
    return ;
}

/*========================================================================
 * Render and display click event
 *========================================================================
 */
function clickRender(){
    switch( env['clicker']){
    case 'Create Exclusion':
        env.click.setUniform('clickValue', env.exclValue) ;
        clickSolve() ;
        requestAnimationFrame(clickSolve) ;
        break ;
    case 'Create Source':
        env.srcValue[1] = env.srcTimer
        env.srcValue[2] = env.srcRate
        env.click.setUniform('clickValue',env.srcValue) ;
        clickSolve() ;
        requestAnimationFrame(clickSolve) ;
        break ;
    case 'Create Value':
        env.click.setUniform('clickValue',env.stcValue) ;
        clickSolve() ;
        requestAnimationFrame(clickSolve) ;
        break ;
   case 'Signal Loc. Picker':
        env.plot.setProbePosition( env.clickPosition ) ;
        env.disp.setProbePosition( env.clickPosition ) ;
        env.rec.probe.setPosition( new Float32Array(env.clickPosition) ) ;
        env.plot.init() ;
        refreshDisplay() ;
        break ;
    case 'Autopace Loc. Picker':
        ///pacePos = new THREE.Vector2(clickPos.x, env.clickPosition[1]) ;
        paceTime = 0 ;
    }
    return ;
}
/*========================================================================
 * solve click event
 *========================================================================
 */
function clickSolve(){
    env.click.render() ;
    env.clickCopy.render() ;
    refreshDisplay() ;
}

/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * End of require()
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
loadWebGL() ;
} ) ;
