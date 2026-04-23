; DOS Text-Mode Pong — NASM, COM format (ORG 100h)
; Controls: W/S or Arrow Up/Down  |  ESC to quit

BITS 16
ORG  100h

VIDMEM    equ 0B800h
COLS      equ 80
ROWS      equ 25
PAD_H     equ 5
LPAD_COL  equ 3
RPAD_COL  equ 76
BALL_W    equ 2      ; ball width in cells
BALL_H    equ 2      ; ball height in cells
BALL_CHAR equ 0DBh   ; █
PAD_CHAR  equ 0DBh   ; █
DIV_COL   equ 39
X_RATE    equ 6      ; ball moves X every N frames
Y_RATE    equ 10     ; ball moves Y every N frames
FRAME_US  equ 16000  ; ~60fps (microseconds per frame)

start:
    mov  ax, 0003h       ; text mode 80x25
    int  10h
    cld                  ; ensure STOSW increments DI
    mov  ah, 01h         ; hide cursor
    mov  cx, 2000h
    int  10h
    mov  ax, VIDMEM
    mov  es, ax          ; ES = video segment

    ; init state
    mov  byte [leftY],  10
    mov  byte [rightY], 10
    mov  byte [bCol],   40
    mov  byte [bRow],   12
    mov  byte [bvx],    1
    mov  byte [bvy],    1
    mov  byte [frmX],   0
    mov  byte [frmY],   0
    mov  byte [scoreL], 0
    mov  byte [scoreR], 0

    call draw_divider

main:
    call erase_ball
    call erase_lpad
    call erase_rpad

    ; --- keyboard (non-blocking) ---
    mov  ah, 01h
    int  16h
    jz   .nokey
    mov  ah, 00h
    int  16h
    cmp  ah, 48h   ; up arrow
    je   .up
    cmp  al, 'w'
    je   .up
    cmp  al, 'W'
    je   .up
    cmp  ah, 50h   ; down arrow
    je   .dn
    cmp  al, 's'
    je   .dn
    cmp  al, 'S'
    je   .dn
    cmp  al, 27    ; ESC
    je   .quit
    jmp  .nokey
.up:
    cmp  byte [leftY], 0
    je   .nokey
    dec  byte [leftY]
    jmp  .nokey
.dn:
    mov  al, [leftY]
    add  al, PAD_H
    cmp  al, ROWS
    jae  .nokey
    inc  byte [leftY]
.nokey:

    ; --- AI ---
    movsx ax, byte [bRow]    ; ax = ball row
    movsx bx, byte [rightY]  ; bx = right pad top
    add  bx, PAD_H/2         ; bx = right pad center
    cmp  ax, bx
    je   .aidone
    jl   .aiup               ; ball above center → move pad up
    ; ball below → move pad down
    mov  al, [rightY]
    add  al, PAD_H
    cmp  al, ROWS
    jae  .aidone
    inc  byte [rightY]
    jmp  .aidone
.aiup:
    cmp  byte [rightY], 0
    je   .aidone
    dec  byte [rightY]
.aidone:

    ; --- ball X ---
    inc  byte [frmX]
    mov  al, [frmX]
    cmp  al, X_RATE
    jb   .nox
    mov  byte [frmX], 0
    movsx ax, byte [bvx]
    add  al, [bCol]
    ; score: past left?
    test al, al
    jle  .score_r
    ; past right?
    cmp  al, COLS-BALL_W
    jge  .score_l
    mov  [bCol], al
    ; left paddle hit?
    cmp  byte [bCol], LPAD_COL+1
    jg   .chkrp
    call ball_rows_hit_left
    jnz  .nox
    neg  byte [bvx]
    mov  byte [bCol], LPAD_COL+1
    jmp  .nox
.chkrp:
    cmp  byte [bCol], RPAD_COL-BALL_W
    jl   .nox
    call ball_rows_hit_right
    jnz  .nox
    neg  byte [bvx]
    mov  byte [bCol], RPAD_COL-BALL_W
.nox:

    ; --- ball Y ---
    inc  byte [frmY]
    mov  al, [frmY]
    cmp  al, Y_RATE
    jb   .noy
    mov  byte [frmY], 0
    movsx ax, byte [bvy]
    add  al, [bRow]
    cmp  al, 0
    jge  .chkbot
    neg  byte [bvy]
    mov  al, 0
.chkbot:
    cmp  al, ROWS-BALL_H
    jle  .yok
    neg  byte [bvy]
    mov  al, ROWS-BALL_H
.yok:
    mov  [bRow], al
.noy:

    call draw_lpad
    call draw_rpad
    call draw_ball
    call draw_score

    ; sleep FRAME_US microseconds (Int 15h AH=86h; CX:DX = 32-bit µs count)
    mov  ah, 86h
    mov  cx, 0
    mov  dx, FRAME_US
    int  15h

    jmp  main

.score_l:                    ; ball exited right → left player scores
    cmp  byte [scoreL], 9    ; cap at 9 so draw_score stays in digits
    jae  .sl_done
    inc  byte [scoreL]
.sl_done:
    call reset_ball_l
    call draw_score
    jmp  main
.score_r:                    ; ball exited left → right player scores
    cmp  byte [scoreR], 9
    jae  .sr_done
    inc  byte [scoreR]
.sr_done:
    call reset_ball_r
    call draw_score
    jmp  main

.quit:
    mov  ah, 01h
    mov  cx, 0607h           ; restore cursor
    int  10h
    mov  ax, 0003h
    int  10h
    int  20h

; ===== subroutines =====

; cell_addr: DH=row, DL=col  →  DI = video offset
; trashes AX; saves/restores CX
cell_addr:
    push cx
    push dx               ; save DL (col) — MUL would clobber DL via DX
    xor  ax, ax
    mov  al, dh
    mov  cx, COLS*2       ; 160
    mul  cx               ; AX = row*160
    pop  dx               ; restore col into DL
    movzx di, dl
    shl  di, 1
    add  di, ax
    pop  cx
    ret

; put_char: write AL=char, AH=attr at ES:DI (uses STOSW, DF must be 0)
put_char:
    xchg al, ah           ; stosw writes low byte first (AL→[DI], AH→[DI+1])
    xchg al, ah           ; ...so AL=char AH=attr is already correct → just stosw
    stosw
    ret

draw_lpad:
    mov  dh, [leftY]
    mov  dl, LPAD_COL
    mov  cx, PAD_H
.lp: call cell_addr
    mov  al, PAD_CHAR
    mov  ah, 0Fh
    call put_char
    inc  dh
    loop .lp
    ret

erase_lpad:
    mov  dh, [leftY]
    mov  dl, LPAD_COL
    mov  cx, PAD_H
.lp: call cell_addr
    mov  al, ' '
    mov  ah, 07h
    call put_char
    inc  dh
    loop .lp
    ret

draw_rpad:
    mov  dh, [rightY]
    mov  dl, RPAD_COL
    mov  cx, PAD_H
.lp: call cell_addr
    mov  al, PAD_CHAR
    mov  ah, 0Fh
    call put_char
    inc  dh
    loop .lp
    ret

erase_rpad:
    mov  dh, [rightY]
    mov  dl, RPAD_COL
    mov  cx, PAD_H
.lp: call cell_addr
    mov  al, ' '
    mov  ah, 07h
    call put_char
    inc  dh
    loop .lp
    ret

; draw/erase a BALL_W × BALL_H block anchored at (bRow, bCol)
draw_ball:
    mov  al, BALL_CHAR
    mov  ah, 0Fh
    jmp  _ball_block
erase_ball:
    mov  al, ' '
    mov  ah, 07h
    ; fallthrough
_ball_block:
    mov  bl, BALL_H
    mov  dh, [bRow]
.row:
    push bx
    push ax
    mov  dl, [bCol]
    mov  cx, BALL_W
.col:
    push ax
    call cell_addr
    pop  ax
    call put_char
    inc  dl
    loop .col
    pop  ax
    pop  bx
    inc  dh
    dec  bl
    jnz  .row
    ret

; Returns ZF=1 (hit) if ball rows [bRow, bRow+BALL_H-1] overlap
;   paddle rows [leftY/rightY, ...+PAD_H-1]. ZF=0 (no hit) otherwise.
; Trashes AX, BX, CX.
ball_rows_hit_left:
    mov  al, [leftY]
    jmp  _ball_rows_hit
ball_rows_hit_right:
    mov  al, [rightY]
    ; fallthrough
_ball_rows_hit:
    ; bl = padTop, bh = padTop + PAD_H
    mov  bl, al
    mov  bh, al
    add  bh, PAD_H
    ; cl = bRow, ch = bRow + BALL_H
    mov  cl, [bRow]
    mov  ch, cl
    add  ch, BALL_H
    ; overlap iff bRow < padTop+PAD_H AND bRow+BALL_H > padTop
    cmp  cl, bh
    jge  .miss
    cmp  ch, bl
    jle  .miss
    xor  ax, ax              ; ZF=1 → hit
    ret
.miss:
    or   al, 1               ; ZF=0 → miss
    ret

draw_divider:
    xor  dh, dh
    mov  cx, ROWS
.lp: mov  dl, DIV_COL
    call cell_addr
    mov  al, '|'
    mov  ah, 08h
    call put_char
    inc  dh
    loop .lp
    ret

draw_score:
    ; "L - R" at row 0, centered (cols 35-37)
    mov  dh, 0
    mov  dl, 35
    call cell_addr
    mov  al, [scoreL]
    add  al, '0'
    mov  ah, 0Eh         ; yellow
    call put_char
    mov  al, '-'
    mov  ah, 07h
    call put_char
    mov  al, [scoreR]
    add  al, '0'
    mov  ah, 0Eh
    call put_char
    ret

reset_ball_l:            ; serve toward right
    mov  byte [bCol], 40
    mov  byte [bRow], 12
    mov  byte [bvx],  1
    mov  byte [bvy],  1
    mov  byte [frmX], 0
    mov  byte [frmY], 0
    ret

reset_ball_r:            ; serve toward left
    mov  byte [bCol], 40
    mov  byte [bRow], 12
    mov  byte [bvx],  -1
    mov  byte [bvy],  1
    mov  byte [frmX], 0
    mov  byte [frmY], 0
    ret

; ---------- data ----------
leftY:  db 10
rightY: db 10
bCol:   db 40
bRow:   db 12
bvx:    db 1
bvy:    db 1
frmX:   db 0
frmY:   db 0
scoreL: db 0
scoreR: db 0
