/* tslint:disable:no-namespace */
export namespace GraphsonTestBodies {
    export const vertexGraphSONExample = {
        "id": "i1983298",
        "label": "person",
        "type": "vertex",
        "properties": {
            "name": [{
                "id": 0,
                "value": "marko"
            }],
            "location": [{
                "id": 6,
                "value": "san diego",
                "properties": {
                    "startTime": 1997,
                    "endTime": 2001
                }
            }, {
                "id": 7,
                "value": "santa cruz",
                "properties": {
                    "startTime": 2001,
                    "endTime": 2004
                }
            }, {
                "id": 8,
                "value": "brussels",
                "properties": {
                    "startTime": 2004,
                    "endTime": 2005
                }
            }, {
                "id": 9,
                "value": "santa fe",
                "properties": {
                    "startTime": 2005
                }
            }]
        }
    };

    export const edgeGraphSONExample = {
        "id": "811fc521-75b9-4b4e-b98d-baf53c0e146d",
        "label": "JBOD",
        "type": "edge",
        "inVLabel": "person",
        "outVLabel": "person",
        "inV": "8de4a734-9061-4d16-90b7-2eb610b73f4d",
        "outV": "3e123da1-5b6d-44b0-8093-45baa4fc8b96"
    }
}