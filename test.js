function printMultiplicationTable(){
    for(i=1; i<=5; i++){
        let row = '' ;
        let column = '' ;
        for(j=1; j<=3; j++){
            row = row + (i*j) + '\t';
        }
        console.log(row);
    }
}
printMultiplicationTable()