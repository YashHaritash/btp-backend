#include <iostream>
#include "calculator.h"
using namespace std;

int main() {
    Calculator calc;
    
    cout << "Testing Calculator Class:" << endl;
    cout << "5 + 3 = " << calc.add(5, 3) << endl;
    cout << "10 - 4 = " << calc.subtract(10, 4) << endl;
    cout << "6 * 7 = " << calc.multiply(6, 7) << endl;
    cout << "15 / 3 = " << calc.divide(15, 3) << endl;
    
    // Test division by zero
    cout << "10 / 0 = " << calc.divide(10, 0) << endl;
    
    return 0;
}