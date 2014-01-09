/*

    Written by Gareth Robinson (robinson.gareth@gmail.com)
    Simple C program for testing and visualising the size
    of the structs used to store the songs 

    gcc protocol.c -o visual
    ./visual

*/

#include <iostream>

#define NUM_TRACKS 4

enum error_state
{
    no_error = 0,
    has_error = 1,
    invalid_memory_bank = 2
};

enum response_result
{
    failed              = 0,
    succeeded           = 1,
    bad_checksum        = 2,
    unknown_command     = 3
};

enum protocol_command
{
    reserved_0          = 0x0,
    setup_test          = 0x1,
    scale_vibration     = 0x2,
    test_vibrator       = 0x3,
    store_pattern       = 0x4,
    pattern_count       = 0x5,
    play_pattern        = 0x6,
    stop_pattern        = 0x7
};

struct keyframe
{
    unsigned short      start_time;
    unsigned short      duration;
    unsigned char       vibration;
    unsigned char       interpolate;
    
    keyframe ( ) { start_time = 0; duration = 0; vibration = 0; interpolate = 0; }
};

struct track
{
    unsigned char       num_keyframes;
    keyframe            keyframes[16];
    
    track ( )           { num_keyframes = 16; };
};//__attribute((packed))__;

struct pattern_data
{
    unsigned char       memory_bank;
    unsigned char       num_tracks;
    track               tracks[NUM_TRACKS];
    
    pattern_data ( )    { num_tracks = NUM_TRACKS; };
};

void printbincharpad(char c)
{
    for (int i = 7; i >= 0; --i)
    {
        putchar( (c & (1 << i)) ? '1' : '0' );
    }
}

void printLineHeader(int i) {
    if (i < 10) {
        std::cout << i << "        ";
    } else {
        if (i < 100) {
            std::cout << i << "       ";
        } else {
            std::cout << i << "      ";
        }
    }
}

void inspectPattern(pattern_data& pattern) {
    std::cout << "Pattern: " << std::endl;
    std::cout << "========================" << std::endl;
    char* _pattern = (char*)(&pattern);

    for (int i=0; i<50; i++) {
        for (int j=0; j<10; j++) {
            printLineHeader((i * 10) + j);
        }
        std::cout << std::endl;
        for (int j=0; j<10; j++) {
            if (((i * 10 + j)) < 394) {
                printbincharpad(*(_pattern + ((i * 10) + j)));
                std::cout << " ";
            }
        }
        std::cout << std::endl;
    }

}

int main() {
    std::cout << "Size: " << sizeof(pattern_data) << std::endl;
    pattern_data pattern1;
    inspectPattern(pattern1);
    return 0;
}