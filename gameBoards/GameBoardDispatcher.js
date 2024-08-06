// game board dispatcher object 
import * as THREE from 'three'

import Board_1 from "./board_1"
import Board_2 from "./board_2"

const boards = [
    new Board_1(),
    new Board_2(),
]

const activeBoard = -1

class GameBoardDispatcher extends THREE.Group {
    constructor() {
        super()

        this.gameBoard = null
    }

    changeBoard(index) {
        if (index > boards.length - 1) {
            console.log("input out of bounds")
            return
        }

        if (this.gameBoard != null) {
            // unmount active board 
            this.gameBoard.unmount();
            this.remove(this.gameBoard);
        }

        // mount 

        this.gameBoard = boards[index]
        this.gameBoard.mount();
        this.add(this.gameBoard);
    }
}

export default GameBoardDispatcher; 