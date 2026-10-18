' ==============================================================================
' N-Ball v2.2 - Complete BlitzMax Reconstruction (Android & Desktop Compatible)
' Original Game (C) 2005-2008 Matteo Guarnieri (Ragdollsoft)
' Faithfully Reconstructed from x86 Binary & Level Datasets
' ==============================================================================

SuperStrict

Framework BRL.GLMax2D
Import BRL.StandardIO
Import BRL.LinkedList
Import BRL.FileSystem
Import BRL.Retro
Import BRL.WavLoader
Import BRL.OggLoader
Import BRL.PngLoader
Import BRL.Random

' ------------------------------------------------------------------------------
' Exact Physics & Scoring Constants Recovered from .data Section of N-Ball v2.2
' ------------------------------------------------------------------------------
Const GRAVITY:Double        = 0.30000001192092896
Const AIR_DAMPING:Double    = 0.9990000128746033
Const RESTITUTION_Y:Double  = 0.800000011920929
Const FRICTION_X:Double     = 0.8999999761581421
Const MOVE_ACCEL:Double     = 0.20000000298023224
Const JUMP_IMPULSE:Double   = 4.900000095367432
Const JUMP_COOLDOWN:Int     = 5
Const PLAYER_RADIUS:Double  = 20.0
Const CYCLE_WINDOW:Int      = 7200 ' 2 minutes at 60Hz for time bonus

' ------------------------------------------------------------------------------
' Types
' ------------------------------------------------------------------------------

Type TBall
    Field id:Int
    Field m:Double
    Field x:Double, y:Double
    Field oldx:Double, oldy:Double
    Field anchorx:Double, anchory:Double
    Field vx:Double, vy:Double
    Field ax:Double, ay:Double
    Field r:Double
    Field anchored:Int
    Field rebounded:Int
    Field colorR:Int, colorG:Int, colorB:Int
    Field kind:String
    Field flag:Int
    Field rotation:Double
    Field touchingSurface:Int

    Method UpdateV()
        If anchored Return
        vx = (x - oldx) * AIR_DAMPING
        vy = (y - oldy) * AIR_DAMPING
        oldx = x
        oldy = y
        x :+ vx + ax
        y :+ vy + ay + GRAVITY
        rebounded = 0
    End Method
End Type

Type TLink
    Field ball1:TBall
    Field ball2:TBall
    Field distance:Double
    Field thickness:Double
    Field colorR:Int, colorG:Int, colorB:Int
    Field kind:String

    Method ShiftBalls()
        Local dx:Double = ball2.x - ball1.x
        Local dy:Double = ball2.y - ball1.y
        Local dist:Double = Sqr(dx * dx + dy * dy)
        If dist < 0.00001 Return

        Local diff:Double = (dist - distance) / dist
        Local factor:Double = 0.5

        If Not ball1.anchored And Not ball2.anchored
            ball1.x :+ dx * factor * diff
            ball1.y :+ dy * factor * diff
            ball2.x :- dx * factor * diff
            ball2.y :- dy * factor * diff
        Else If Not ball1.anchored
            ball1.x :+ dx * diff
            ball1.y :+ dy * diff
        Else If Not ball2.anchored
            ball2.x :- dx * diff
            ball2.y :- dy * diff
        End If
    End Method
End Type

Type TTension
    Field ball1:TBall
    Field ball2:TBall ' Hinge vertex
    Field ball3:TBall
    Field targetAngle:Double
    Field strength:Double

    Method PartialTension()
        Local a1:Double = ATan2(ball1.y - ball2.y, ball1.x - ball2.x)
        Local a2:Double = ATan2(ball3.y - ball2.y, ball3.x - ball2.x)
        Local diff:Double = a2 - a1 - targetAngle

        While diff < -180.0
            diff :+ 360.0
        Wend
        While diff > 180.0
            diff :- 360.0
        Wend

        If Abs(diff) > 0.0001
            Local rot:Double = diff * strength * 0.5
            If Not ball1.anchored
                Local d1:Double = Sqr((ball1.x - ball2.x)^2 + (ball1.y - ball2.y)^2)
                ball1.x = ball2.x + Cos(a1 + rot) * d1
                ball1.y = ball2.y + Sin(a1 + rot) * d1
            End If
            If Not ball3.anchored
                Local d3:Double = Sqr((ball3.x - ball2.x)^2 + (ball3.y - ball2.y)^2)
                ball3.x = ball2.x + Cos(a2 - rot) * d3
                ball3.y = ball2.y + Sin(a2 - rot) * d3
            End If
        End If
    End Method
End Type

Type TTrailPoint
    Field x:Double, y:Double
    Field rotation:Double
End Type

Type TSpark
    Field x:Float, y:Float
    Field vx:Float, vy:Float
    Field life:Float
    Field decay:Float
    Field size:Float
End Type

' ------------------------------------------------------------------------------
' Main Game Engine Class (TGame)
' ------------------------------------------------------------------------------

Type TGame
    Field ballList:TList
    Field linkList:TList
    Field tensionList:TList
    Field sparkList:TList
    Field trailList:TList
    Field player:TBall

    Field balljump:Int
    Field totalscore:Int
    Field levelscore:Int
    Field timebonus:Int
    Field cycles:Int
    Field lives:Int
    Field level:Int
    Field campaign:Int

    Field camX:Double, camY:Double
    Field state:String ' "TITLE", "PLAYING", "PAUSED", "LEVEL_COMPLETE", "GAMEOVER"
    Field trailSize:Int

    ' Visual Assets
    Field ballSprite:TImage
    Field nballSprite:TImage
    Field platformSprite:TImage
    Field sparkSprite:TImage
    Field logoImage:TImage
    Field ragdollImage:TImage

    ' Audio
    Field jumpSound:TSound
    Field musicSound:TSound
    Field musicChannel:TChannel

    Method New()
        ballList = CreateList()
        linkList = CreateList()
        tensionList = CreateList()
        sparkList = CreateList()
        trailList = CreateList()

        trailSize = 5
        campaign = 1
        level = 1
        lives = 2
        totalscore = 0
        state = "TITLE"

        LoadAssets()
    End Method

    Method LoadAssets()
        AutoMidHandle True
        ballSprite = LoadImage("media/ball.png")
        nballSprite = LoadImage("media/nball.png")
        platformSprite = LoadImage("media/plat.png")
        sparkSprite = LoadImage("media/spark.png")
        ragdollImage = LoadImage("media/205275.png")

        jumpSound = LoadSound("media/jump.wav")
        musicSound = LoadSound("media/1.ogg", SOUND_LOOP)
    End Method

    Method StartLevel(camp:Int, lvl:Int)
        ClearList(ballList)
        ClearList(linkList)
        ClearList(tensionList)
        ClearList(sparkList)
        ClearList(trailList)

        campaign = camp
        level = lvl
        cycles = 0
        balljump = 0
        state = "PLAYING"

        LoadLevelFile("campaigns/" + camp + "/" + lvl)

        If Not musicChannel Or Not ChannelPlaying(musicChannel)
            musicChannel = CueSound(musicSound)
            ResumeChannel(musicChannel)
        End If
    End Method

    Method LoadLevelFile(path:String)
        Local file:TStream = ReadFile(path)
        If Not file Return

        Local headerLine:String = ReadLine(file)
        If headerLine lives = headerLine.ToInt()
        If lives <= 0 lives = 2

        Local ballMap:TMap = CreateMap()

        While Not Eof(file)
            Local line:String = Trim(ReadLine(file))
            If line = "New Ball"
                Local b:TBall = New TBall
                b.id = ReadLine(file).ToInt()
                b.m = ReadLine(file).ToDouble()
                b.x = ReadLine(file).ToDouble()
                b.y = ReadLine(file).ToDouble()
                b.oldx = b.x
                b.oldy = b.y
                b.r = ReadLine(file).ToDouble()
                b.anchored = ReadLine(file).ToInt()
                b.anchorx = ReadLine(file).ToDouble()
                b.anchory = ReadLine(file).ToDouble()
                Local rmult:Double = ReadLine(file).ToDouble()
                b.colorR = ReadLine(file).ToInt()
                b.colorG = ReadLine(file).ToInt()
                b.colorB = ReadLine(file).ToInt()
                b.kind = Trim(ReadLine(file))
                b.flag = ReadLine(file).ToInt()
                b.rotation = 0

                ListAddLast(ballList, b)
                MapInsert(ballMap, String(b.id), b)

                If b.id = 1
                    player = b
                    player.r = PLAYER_RADIUS
                End If

            Else If line = "New Link"
                Local b1Id:String = Trim(ReadLine(file))
                Local b2Id:String = Trim(ReadLine(file))
                Local lLength:Double = ReadLine(file).ToDouble()
                Local lThick:Double = ReadLine(file).ToDouble()
                Local cr:Int = ReadLine(file).ToInt()
                Local cg:Int = ReadLine(file).ToInt()
                Local cb:Int = ReadLine(file).ToInt()
                Local lKind:String = Trim(ReadLine(file))

                Local b1:TBall = TBall(MapValueForKey(ballMap, b1Id))
                Local b2:TBall = TBall(MapValueForKey(ballMap, b2Id))

                If b1 And b2
                    Local lk:TLink = New TLink
                    lk.ball1 = b1
                    lk.ball2 = b2
                    If lLength > 0
                        lk.distance = lLength
                    Else
                        lk.distance = Sqr((b2.x - b1.x)^2 + (b2.y - b1.y)^2)
                    End If
                    lk.thickness = Max(4.0, lThick)
                    lk.colorR = cr
                    lk.colorG = cg
                    lk.colorB = cb
                    lk.kind = lKind
                    ListAddLast(linkList, lk)
                End If

            Else If line = "New Tension"
                Local b1Id:String = Trim(ReadLine(file))
                Local b2Id:String = Trim(ReadLine(file))
                Local b3Id:String = Trim(ReadLine(file))
                Local tAngle:Double = ReadLine(file).ToDouble()
                Local tStiff:Double = ReadLine(file).ToDouble()

                Local b1:TBall = TBall(MapValueForKey(ballMap, b1Id))
                Local b2:TBall = TBall(MapValueForKey(ballMap, b2Id))
                Local b3:TBall = TBall(MapValueForKey(ballMap, b3Id))

                If b1 And b2 And b3
                    Local ts:TTension = New TTension
                    ts.ball1 = b1
                    ts.ball2 = b2
                    ts.ball3 = b3
                    ts.targetAngle = tAngle
                    ts.strength = Min(1.0, tStiff * 0.05)
                    ListAddLast(tensionList, ts)
                End If
            End If
        Wend

        CloseFile(file)
    End Method

    Method MoveBall1()
        If Not player Return

        player.ax = 0
        If KeyDown(KEY_LEFT) Or KeyDown(KEY_A)
            player.ax :- MOVE_ACCEL
        End If
        If KeyDown(KEY_RIGHT) Or KeyDown(KEY_D)
            player.ax :+ MOVE_ACCEL
        End If

        ' Autojump request
        If (KeyDown(KEY_SPACE) Or KeyDown(KEY_UP) Or KeyDown(KEY_W)) And balljump >= 0
            balljump = 1
        End If

        ' Roll rotation tied to displacement
        Local dxRoll:Double = player.x - player.oldx
        player.rotation :+ (dxRoll / player.r) * 57.2957795 ' rad to deg
    End Method

    Method UpdatePhysics()
        If state <> "PLAYING" Or Not player Return

        cycles :+ 1
        If balljump < 0 balljump :+ 1

        MoveBall1()

        ' 1. Verlet Integration
        For Local b:TBall = EachIn ballList
            b.UpdateV()
        Next

        player.touchingSurface = False

        ' 2. Relaxation Iterations (3 steps as decompiled)
        For Local iter:Int = 0 Until 3
            For Local lk:TLink = EachIn linkList
                lk.ShiftBalls()
            Next
            For Local ts:TTension = EachIn tensionList
                ts.PartialTension()
            Next
            CheckCollisions()
        Next

        ' 3. Out of bounds check
        If player.y > 1800.0
            Died()
        End If

        ' 4. Update Camera
        camX :+ ((player.x - GraphicsWidth() / 2) - camX) * 0.12
        camY :+ ((player.y - GraphicsHeight() / 2) - camY) * 0.12

        ' 5. Update Trail
        If trailSize > 0
            Local tp:TTrailPoint = New TTrailPoint
            tp.x = player.x
            tp.y = player.y
            tp.rotation = player.rotation
            ListAddLast(trailList, tp)
            While CountList(trailList) > trailSize * 3
                ListRemove(trailList, First(trailList))
            Wend
        End If

        ' 6. Update Sparks
        For Local sp:TSpark = EachIn sparkList
            sp.x :+ sp.vx
            sp.y :+ sp.vy
            sp.vy :+ 0.15
            sp.life :- sp.decay
            If sp.life <= 0 ListRemove(sparkList, sp)
        Next
    End Method

    Method CheckCollisions()
        ' Link vs Ball Collisions
        For Local lk:TLink = EachIn linkList
            SolveBallLink(player, lk)
        Next

        For Local b:TBall = EachIn ballList
            If b.anchored Or b.id = 1 Or b.kind = "background" Continue
            For Local lk:TLink = EachIn linkList
                If lk.ball1 = b Or lk.ball2 = b Continue
                SolveBallLink(b, lk)
            Next
        Next

        ' Ball vs Ball
        For Local b1:TBall = EachIn ballList
            If b1.kind = "background" Continue
            For Local b2:TBall = EachIn ballList
                If b1 = b2 Or b2.kind = "background" Continue
                If b1.anchored And b2.anchored Continue

                Local dx:Double = b2.x - b1.x
                Local dy:Double = b2.y - b1.y
                Local dist:Double = Sqr(dx * dx + dy * dy)
                Local minDist:Double = b1.r + b2.r

                If dist < minDist And dist > 0.00001
                    If b1.id = 1 Or b2.id = 1
                        Local target:TBall = b1
                        If b1.id = 1 target = b2

                        If target.kind = "stop"
                            PassedLevel()
                            Return
                        End If
                        If target.kind = "damaging"
                            Died()
                            Return
                        End If

                        player.touchingSurface = True
                        If balljump = 1
                            ExecuteJump(-dx / dist, -dy / dist)
                        End If
                    End If

                    Local overlap:Double = minDist - dist
                    Local nx:Double = dx / dist
                    Local ny:Double = dy / dist

                    If Not b1.anchored And Not b2.anchored
                        b1.x :- nx * overlap * 0.5
                        b1.y :- ny * overlap * 0.5
                        b2.x :+ nx * overlap * 0.5
                        b2.y :+ ny * overlap * 0.5
                    Else If Not b1.anchored
                        b1.x :- nx * overlap
                        b1.y :- ny * overlap
                    Else If Not b2.anchored
                        b2.x :+ nx * overlap
                        b2.y :+ ny * overlap
                    End If
                End If
            Next
        Next
    End Method

    Method SolveBallLink(b:TBall, lk:TLink)
        Local p1:TBall = lk.ball1
        Local p2:TBall = lk.ball2
        Local dx:Double = p2.x - p1.x
        Local dy:Double = p2.y - p1.y

        If Abs(dx) < 0.00001 dx = 0.00001
        If Abs(dy) < 0.00001 dy = 0.00001

        Local lenSq:Double = dx * dx + dy * dy
        Local t:Double = ((b.x - p1.x) * dx + (b.y - p1.y) * dy) / lenSq
        t = Max(0.0, Min(1.0, t))

        Local closestX:Double = p1.x + t * dx
        Local closestY:Double = p1.y + t * dy
        Local distX:Double = b.x - closestX
        Local distY:Double = b.y - closestY
        Local dist:Double = Sqr(distX * distX + distY * distY)
        Local minDist:Double = b.r + (lk.thickness / 2.0)

        If dist < minDist
            If b.id = 1
                If lk.kind = "stop"
                    PassedLevel()
                    Return
                End If
                If lk.kind = "damaging"
                    Died()
                    Return
                End If

                b.touchingSurface = True

                ' Autojump trigger on impact
                If balljump = 1
                    Local nx:Double = 0, ny:Double = -1
                    If dist > 0.00001
                        nx = distX / dist
                        ny = distY / dist
                    End If
                    ExecuteJump(nx, ny)

                    ' Newton's Third Law platform reaction (0x4b35e8 - 0x4b364a)
                    If Not p1.anchored p1.oldy :+ JUMP_IMPULSE * (1.0 - t) * 0.5
                    If Not p2.anchored p2.oldy :+ JUMP_IMPULSE * t * 0.5
                End If
            End If

            Local overlap:Double = minDist - Max(0.00001, dist)
            Local nx:Double = distX / Max(0.00001, dist)
            Local ny:Double = distY / Max(0.00001, dist)

            If Not b.anchored
                b.x :+ nx * overlap
                b.y :+ ny * overlap
            End If
            If Not p1.anchored
                p1.x :- nx * overlap * (1.0 - t) * 0.5
                p1.y :- ny * overlap * (1.0 - t) * 0.5
            End If
            If Not p2.anchored
                p2.x :- nx * overlap * t * 0.5
                p2.y :- ny * overlap * t * 0.5
            End If
        End If
    End Method

    Method ExecuteJump(nx:Double, ny:Double)
        Local jny:Double = ny
        If jny > -0.2 jny = -1.0
        Local jnx:Double = nx * 0.6

        player.oldx = player.x - jnx * JUMP_IMPULSE
        player.oldy = player.y - jny * JUMP_IMPULSE * 2.75
        balljump = -JUMP_COOLDOWN

        PlaySound(jumpSound)
        EmitSparks(player.x, player.y + player.r, 14)
    End Method

    Method EmitSparks(sx:Double, sy:Double, count:Int)
        For Local i:Int = 0 Until count
            Local sp:TSpark = New TSpark
            Local angle:Double = Rnd(0, 360)
            Local speed:Double = Rnd(2, 6)
            sp.x = sx
            sp.y = sy
            sp.vx = Cos(angle) * speed
            sp.vy = Sin(angle) * speed - 1.5
            sp.life = 1.0
            sp.decay = Rnd(0.02, 0.05)
            sp.size = Rnd(10, 24)
            ListAddLast(sparkList, sp)
        Next
    End Method

    Method PassedLevel()
        state = "LEVEL_COMPLETE"
        Local baseScore:Int = level * 1000
        timebonus = Max(0, Int((baseScore * (CYCLE_WINDOW - cycles)) / Float(CYCLE_WINDOW)))
        levelscore = baseScore + timebonus
        totalscore :+ levelscore
    End Method

    Method Died()
        state = "GAMEOVER"
        If player EmitSparks(player.x, player.y, 40)
        lives :- 1
    End Method

    ' --------------------------------------------------------------------------
    ' Rendering Pipeline (Faithful Retro Aesthetics)
    ' --------------------------------------------------------------------------

    Method DrawGame()
        Cls

        ' 1. Dark Space Coordinate Grid
        SetColor 6, 9, 14
        DrawRect 0, 0, GraphicsWidth(), GraphicsHeight()

        Local minorGrid:Int = 40
        Local majorGrid:Int = 200
        Local sx:Int = -Int(camX) Mod minorGrid
        Local sy:Int = -Int(camY) Mod minorGrid

        SetColor 18, 42, 54
        SetAlpha 0.4
        For Local x:Int = sx Until GraphicsWidth() Step minorGrid
            DrawLine x, 0, x, GraphicsHeight()
        Next
        For Local y:Int = sy Until GraphicsHeight() Step minorGrid
            DrawLine 0, y, GraphicsWidth(), y
        Next

        Local msx:Int = -Int(camX) Mod majorGrid
        Local msy:Int = -Int(camY) Mod majorGrid
        SetColor 28, 70, 88
        SetAlpha 0.6
        For Local x:Int = msx Until GraphicsWidth() Step majorGrid
            DrawLine x, 0, x, GraphicsHeight()
        Next
        For Local y:Int = msy Until GraphicsHeight() Step majorGrid
            DrawLine 0, y, GraphicsWidth(), y
        Next

        SetAlpha 1.0
        SetColor 255, 255, 255

        ' 2. Draw Echo Trail
        If trailSize > 0
            Local count:Int = CountList(trailList)
            Local idx:Int = 0
            For Local tp:TTrailPoint = EachIn trailList
                idx :+ 1
                Local ratio:Float = idx / Float(count)
                SetAlpha ratio * 0.35
                SetRotation tp.rotation
                Local sc:Float = (PLAYER_RADIUS * 2.0 / ImageWidth(ballSprite)) * (0.65 + 0.35 * ratio)
                SetScale sc, sc
                DrawImage ballSprite, tp.x - camX, tp.y - camY
            Next
        End If

        SetAlpha 1.0
        SetScale 1.0, 1.0

        ' 3. Draw Links (Platforms using plat.png)
        For Local lk:TLink = EachIn linkList
            Local dx:Double = lk.ball2.x - lk.ball1.x
            Local dy:Double = lk.ball2.y - lk.ball1.y
            Local dist:Double = Sqr(dx * dx + dy * dy)
            Local angle:Double = ATan2(dy, dx)

            SetRotation angle
            Local sxScale:Float = dist / Float(ImageWidth(platformSprite))
            Local syScale:Float = lk.thickness / Float(ImageHeight(platformSprite))
            SetScale sxScale, syScale

            If lk.kind = "stop"
                SetColor 255, 60, 180
            Else If lk.kind = "damaging"
                SetColor 255, 40, 40
            Else If lk.kind = "background"
                SetAlpha 0.35
                SetColor 200, 200, 200
            Else
                SetColor 255, 255, 255
            End If

            ' Draw stretched platform from ball1 center
            DrawImage platformSprite, (lk.ball1.x + dx * 0.5) - camX, (lk.ball1.y + dy * 0.5) - camY
        Next

        SetRotation 0
        SetScale 1.0, 1.0
        SetAlpha 1.0

        ' 4. Draw Balls
        For Local b:TBall = EachIn ballList
            Local bx:Float = b.x - camX
            Local by:Float = b.y - camY
            Local dScale:Float = (b.r * 2.0) / Float(ImageWidth(ballSprite))

            If b.id = 1
                ' Player
                SetRotation b.rotation
                SetScale dScale, dScale
                SetColor 255, 255, 255
                DrawImage ballSprite, bx, by
            Else
                SetRotation 0
                If b.kind = "stop"
                    SetColor 255, 60, 180
                    DrawOval bx - b.r, by - b.r, b.r * 2, b.r * 2
                Else If b.kind = "damaging"
                    SetColor 255, 30, 30
                    DrawOval bx - b.r, by - b.r, b.r * 2, b.r * 2
                Else If b.anchored
                    SetColor 84, 110, 122
                    DrawOval bx - b.r, by - b.r, b.r * 2, b.r * 2
                    SetColor 176, 190, 197
                    DrawOval bx - b.r * 0.4, by - b.r * 0.4, b.r * 0.8, b.r * 0.8
                Else
                    SetScale dScale, dScale
                    SetColor b.colorR, b.colorG, b.colorB
                    DrawImage ballSprite, bx, by
                End If
            End If
        Next

        ' 5. Draw Particle Sparks
        SetBlend LIGHTBLEND
        SetAlpha 0.85
        For Local sp:TSpark = EachIn sparkList
            Local sScale:Float = (sp.size * sp.life) / Float(ImageWidth(sparkSprite))
            SetScale sScale, sScale
            SetColor 255, 255, 255
            DrawImage sparkSprite, sp.x - camX, sp.y - camY
        Next
        SetBlend ALPHABLEND
        SetScale 1.0, 1.0
        SetAlpha 1.0

        ' 6. In-Game HUD
        SetColor 56, 209, 216
        DrawText "CAMPAIGN " + campaign + " - LEVEL " + level, 20, 15
        DrawText "LIVES: " + lives, 240, 15
        DrawText "SCORE: " + totalscore, GraphicsWidth() / 2 - 40, 15
        DrawText "TIME: " + (cycles / 60) + "s", GraphicsWidth() - 120, 15
    End Method

    Method DrawTitleScreen()
        Cls
        SetColor 6, 9, 14
        DrawRect 0, 0, GraphicsWidth(), GraphicsHeight()

        ' Subtle Grid
        SetColor 18, 42, 54
        SetAlpha 0.3
        For Local x:Int = 0 Until GraphicsWidth() Step 40
            DrawLine x, 0, x, GraphicsHeight()
        Next
        For Local y:Int = 0 Until GraphicsHeight() Step 40
            DrawLine 0, y, GraphicsWidth(), y
        Next

        SetAlpha 1.0
        SetColor 255, 255, 255
        DrawImage nballSprite, GraphicsWidth() / 2, GraphicsHeight() / 2 - 120

        SetColor 230, 248, 250
        DrawText "N - B A L L", GraphicsWidth() / 2 - 45, GraphicsHeight() / 2 - 30
        SetColor 56, 209, 216
        DrawText "2D PHYSICS PLATFORMER", GraphicsWidth() / 2 - 80, GraphicsHeight() / 2 - 10
        SetColor 114, 143, 160
        DrawText "BY MATTEO GUARNIERI - RAG DOLL SOFTWARE", GraphicsWidth() / 2 - 150, GraphicsHeight() / 2 + 10

        SetColor 255, 255, 255
        DrawText "[ PRESS ENTER OR SPACE TO PLAY ]", GraphicsWidth() / 2 - 120, GraphicsHeight() / 2 + 70
        DrawText "[ ESC: QUIT ]", GraphicsWidth() / 2 - 50, GraphicsHeight() / 2 + 100

        If KeyHit(KEY_ENTER) Or KeyHit(KEY_SPACE)
            StartLevel(1, 1)
        End If
    End Method
End Type

' ------------------------------------------------------------------------------
' Main Execution Loop
' ------------------------------------------------------------------------------

Graphics 800, 600, 0, 60
SetClsColor 6, 9, 14

Local game:TGame = New TGame

While Not AppTerminate() And Not KeyHit(KEY_ESCAPE)
    If game.state = "TITLE"
        game.DrawTitleScreen()
    Else If game.state = "PLAYING"
        game.UpdatePhysics()
        game.DrawGame()
    Else If game.state = "LEVEL_COMPLETE"
        game.DrawGame()
        SetColor 56, 209, 216
        DrawText "LEVEL COMPLETED! PRESS ENTER TO CONTINUE", GraphicsWidth() / 2 - 150, GraphicsHeight() / 2
        If KeyHit(KEY_ENTER) Or KeyHit(KEY_SPACE)
            If game.level < 10
                game.StartLevel(game.campaign, game.level + 1)
            Else
                game.StartLevel(Min(4, game.campaign + 1), 1)
            End If
        End If
    Else If game.state = "GAMEOVER"
        game.DrawGame()
        SetColor 255, 60, 60
        DrawText "GAME OVER! PRESS ENTER TO RETRY", GraphicsWidth() / 2 - 120, GraphicsHeight() / 2
        If KeyHit(KEY_ENTER) Or KeyHit(KEY_SPACE)
            game.lives = 2
            game.StartLevel(game.campaign, game.level)
        End If
    End If

    Flip 1
Wend

End
